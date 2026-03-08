import { useState, useEffect } from "react";
import { fetchChannelStatus, type ChannelsStatusSnapshot } from "../../api/index.js";

export function useChannelsData() {
  const [snapshot, setSnapshot] = useState<ChannelsStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadChannelStatus(showLoading = true) {
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);

    try {
      const data = await fetchChannelStatus(true);
      setError(null);
      setSnapshot(data);
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
        const data = await fetchChannelStatus(true);
        setError(null);
        setSnapshot(data);
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
        const data = await fetchChannelStatus(true);
        setError(null);
        setSnapshot(data);
        setLoading(false);
        setRefreshing(false);
        // Healthy — next poll in 30s
        timer = setTimeout(poll, 30000);
      } catch (err) {
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
