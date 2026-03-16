import { useState, useEffect } from "react";
import { fetchChannelStatus, type ChannelsStatusSnapshot } from "../../api/index.js";

/**
 * Two-phase channel status loading:
 * Phase 1 — fetch with probe=false for instant results (runtime state only).
 * Phase 2 — fire a background probe=true request to update connectivity status.
 * If the background probe fails, the non-probe data is silently kept.
 */
export function useChannelsData() {
  const [snapshot, setSnapshot] = useState<ChannelsStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /** Fire a background probe and update snapshot when it resolves. */
  function backgroundProbe(cancelled?: () => boolean) {
    fetchChannelStatus(true)
      .then((data) => {
        if (cancelled && cancelled()) return;
        if (data) {
          setSnapshot(data);
        }
      })
      .catch(() => {
        // Silently keep the non-probe data
      });
  }

  async function loadChannelStatus(showLoading = true) {
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);

    try {
      // Phase 1: fast load without probe
      const data = await fetchChannelStatus(false);
      setError(null);
      setSnapshot(data);
      // Phase 2: background probe for connectivity status
      backgroundProbe();
    } catch (err) {
      // Only show error on initial load; background refreshes keep existing data
      if (showLoading || !snapshot) {
        setError(String(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /** Retry loading until gateway is back (after config changes trigger a restart). */
  function retryUntilReady(attempt = 0) {
    const delays = [1500, 3000, 5000];
    const delay = delays[attempt] ?? delays[delays.length - 1];
    setTimeout(async () => {
      try {
        // Use probe=false for retry — we just need to know gateway is back
        const data = await fetchChannelStatus(false);
        setError(null);
        setSnapshot(data);
        // Once gateway is back, fire background probe for full status
        backgroundProbe();
      } catch {
        if (attempt < delays.length - 1) {
          retryUntilReady(attempt + 1);
        }
      }
    }, delay);
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      setRefreshing(true);
      try {
        // Phase 1: fast load without probe
        const data = await fetchChannelStatus(false);
        if (cancelled) return;
        setError(null);
        setSnapshot(data);
        setLoading(false);
        setRefreshing(false);
        // Phase 2: background probe for connectivity status
        backgroundProbe(() => cancelled);
        // Healthy — next poll in 30s
        timer = setTimeout(poll, 30000);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
        if (!snapshot) setError(String(err));
        // Gateway not ready — retry in 2s
        timer = setTimeout(poll, 2000);
      }
    }

    poll();

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadChannelStatus(false);
  }

  return {
    snapshot, loading, error, refreshing,
    loadChannelStatus, retryUntilReady,
    handleRefresh,
  };
}
