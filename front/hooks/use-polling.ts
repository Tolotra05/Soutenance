import { useEffect, useRef } from 'react';

/**
 * Calls `callback` every `intervalMs` while `enabled`, skipping ticks while
 * the tab is hidden (no requests from background tabs). Refetch-on-refocus
 * stays the job of each context's own visibilitychange listener.
 *
 * Lightweight stand-in for server push: the backend has no websocket/SSE
 * channel, so this is how server-side changes (e.g. a new pending account)
 * reach an already-open page.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') callbackRef.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
