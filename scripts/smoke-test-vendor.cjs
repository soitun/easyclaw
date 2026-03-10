// @ts-check
// Smoke-tests the vendor/openclaw gateway by spawning it with a minimal
// config and verifying it starts successfully.  Runs against the UNBUNDLED
// vendor tree (no esbuild, no pruning) so it's fast enough for pre-push.
//
// Catches:
//   - Missing or broken dependencies in vendor/openclaw/node_modules
//   - Import errors that crash on startup
//   - isMainModule() / entry-point mismatches
//   - Dynamic require failures
//
// Exit codes:
//   0  — gateway started successfully
//   1  — gateway failed to start (see stderr for diagnostics)

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");

const vendorDir = path.resolve(__dirname, "..", "vendor", "openclaw");
const openclawMjs = path.join(vendorDir, "openclaw.mjs");

// ── Guard: skip if vendor is not provisioned ──
if (!fs.existsSync(openclawMjs)) {
  console.log("[smoke-test-vendor] vendor/openclaw not provisioned, skipping.");
  process.exit(0);
}

if (!fs.existsSync(path.join(vendorDir, "node_modules"))) {
  console.log("[smoke-test-vendor] vendor/openclaw/node_modules not found, skipping.");
  process.exit(0);
}

// ── Guard: skip if vendor has been bundled ──
if (fs.existsSync(path.join(vendorDir, "dist", ".bundled"))) {
  console.log(
    "[smoke-test-vendor] vendor already bundled (.bundled marker), skipping " +
      "(bundle script runs its own smoke test).",
  );
  process.exit(0);
}

console.log("[smoke-test-vendor] Smoke testing vendor gateway...");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "easyclaw-smoke-"));

// Write a minimal config so the gateway can start.
const minimalConfig = {
  gateway: { port: 59999, mode: "local" },
  models: {},
  agents: { defaults: { skipBootstrap: true } },
};
fs.writeFileSync(
  path.join(tmpDir, "openclaw.json"),
  JSON.stringify(minimalConfig),
  "utf-8",
);

const child = spawn(process.execPath, [openclawMjs, "gateway"], {
  cwd: tmpDir,
  env: {
    ...process.env,
    OPENCLAW_CONFIG_PATH: path.join(tmpDir, "openclaw.json"),
    OPENCLAW_STATE_DIR: tmpDir,
    NODE_COMPILE_CACHE: undefined,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let allOutput = "";
let settled = false;

function cleanup() {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

function settle(code) {
  if (settled) return;
  settled = true;
  child.kill("SIGTERM");
  cleanup();
  process.exit(code);
}

child.stdout.on("data", (chunk) => {
  allOutput += chunk.toString();
  checkOutput();
});

child.stderr.on("data", (chunk) => {
  allOutput += chunk.toString();
  checkOutput();
});

function checkOutput() {
  if (settled) return;

  // Gateway started — check for runtime errors
  if (allOutput.includes("[gateway]")) {
    if (allOutput.includes("Cannot find module")) {
      const matches = allOutput.match(/Cannot find module '([^']+)'/g) || [];
      const modules = matches.map(
        (m) => m.match(/Cannot find module '([^']+)'/)?.[1] || "?",
      );
      const unique = [...new Set(modules)];
      console.error(
        `\n[smoke-test-vendor] FAILED: Gateway started but ${unique.length} module(s) missing:\n` +
          `  ${unique.join(", ")}\n`,
      );
      settle(1);
      return;
    }
    console.log("[smoke-test-vendor] Passed: gateway started successfully.");
    settle(0);
    return;
  }

  // Early failure detection
  if (allOutput.includes("Dynamic require of")) {
    const match = allOutput.match(
      /Dynamic require of "([^"]+)" is not supported/,
    );
    const mod = match ? match[1] : "(unknown)";
    console.error(
      `\n[smoke-test-vendor] FAILED: Dynamic require of "${mod}" is not supported.\n`,
    );
    settle(1);
    return;
  }

  if (
    allOutput.includes("Cannot find module") &&
    !allOutput.includes("[gateway]")
  ) {
    const match = allOutput.match(/Cannot find module '([^']+)'/);
    const mod = match ? match[1] : "(unknown)";
    console.error(
      `\n[smoke-test-vendor] FAILED: Cannot find module '${mod}'.\n`,
    );
    settle(1);
    return;
  }
}

// Strip Node.js warnings that flood output and hide real errors.
function filterWarnings(text) {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("(node:") && !line.startsWith("(Use `node --trace-warnings"))
    .join("\n")
    .trim();
}

child.on("close", (code) => {
  if (settled) return;

  if (code === 0 && !allOutput.trim()) {
    console.error(
      `\n[smoke-test-vendor] FAILED: Gateway exited immediately with code 0 and no output.\n` +
        `  Likely cause: isMainModule() check failed.\n`,
    );
    settle(1);
    return;
  }

  const filtered = filterWarnings(allOutput) || "(empty)";
  console.error(
    `\n[smoke-test-vendor] FAILED: Gateway exited with code ${code}.\n` +
      `  Output (first 3000 chars):\n  ${filtered.substring(0, 3000)}\n`,
  );
  settle(1);
});

// Hard timeout: 90 seconds (macOS CI VMs are slow)
const timeout = setTimeout(() => {
  if (settled) return;
  const filtered = filterWarnings(allOutput) || "(empty)";
  console.error(
    `\n[smoke-test-vendor] FAILED: Gateway timed out (90s) with no "[gateway]" output.\n` +
      `  Output (first 3000 chars):\n  ${filtered.substring(0, 3000)}\n`,
  );
  settle(1);
}, 90_000);

// Don't let the timeout keep the process alive if we've already settled
timeout.unref();
