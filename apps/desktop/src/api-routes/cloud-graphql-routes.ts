import type { RouteHandler } from "./api-context.js";
import { parseBody, sendJson } from "./route-utils.js";

export const handleCloudGraphqlRoutes: RouteHandler = async (req, res, _url, pathname, ctx) => {
  if (pathname === "/api/cloud/graphql" && req.method === "POST") {
    if (!ctx.authSession?.getAccessToken()) {
      sendJson(res, 401, { error: "Not authenticated" });
      return true;
    }

    const body = await parseBody(req) as { query?: string; variables?: Record<string, unknown> };
    if (!body.query) {
      sendJson(res, 400, { error: "Missing query" });
      return true;
    }

    try {
      const data = await ctx.authSession.graphqlFetch(body.query, body.variables);
      sendJson(res, 200, { data });
    } catch (err) {
      sendJson(res, 502, { error: err instanceof Error ? err.message : "Cloud GraphQL request failed" });
    }
    return true;
  }

  return false;
};
