/** Poll while the page is visible, with at most one request in flight.
 * Refresh once when a background tab becomes visible again. */
export function startVisiblePolling({ load, documentRef, windowRef, intervalMs = 60_000 }) {
  let stopped = false;
  let pending = false;
  let running = false;
  let timer = null;

  function clearTimer() {
    if (timer !== null) windowRef.clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    clearTimer();
    if (!stopped && !documentRef.hidden) {
      timer = windowRef.setTimeout(refresh, intervalMs);
    }
  }

  async function refresh() {
    if (stopped || documentRef.hidden) return;
    if (running) { pending = true; return; }
    clearTimer();
    running = true;
    try {
      await load();
    } catch (error) {
      // A transient request failure must not stop future refreshes.
      console.error("Visible polling:", error);
    } finally {
      running = false;
      if (!stopped && !documentRef.hidden) {
        if (pending) {
          pending = false;
          void refresh();
        } else {
          schedule();
        }
      }
    }
  }

  function onVisibilityChange() {
    if (documentRef.hidden) {
      clearTimer();
      pending = false;
    } else {
      void refresh();
    }
  }

  documentRef.addEventListener("visibilitychange", onVisibilityChange);
  void refresh();
  return () => {
    stopped = true;
    pending = false;
    clearTimer();
    documentRef.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
