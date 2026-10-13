window.WKD = window.WKD || {};
window.WKD_TOWER_PLANNER_PARTS = window.WKD_TOWER_PLANNER_PARTS || [];
window.WKD_TOWER_PLANNER_PARTS[4] = "";

(function loadTowerPlannerFromChunks() {
  const parts = window.WKD_TOWER_PLANNER_PARTS || [];
  if (window.WKD_TOWER_PLANNER_LOADED) return;
  const ready = parts.length >= 5 && parts.slice(0, 5).every(part => typeof part === 'string' && part.length);
  if (!ready) {
    console.error('[WKD] Tower Planner split files are not loaded in the correct order.');
    return;
  }
  window.WKD_TOWER_PLANNER_LOADED = true;
  try {
    (0, eval)(parts.slice(0, 5).join(''));
  } catch (error) {
    window.WKD_TOWER_PLANNER_LOADED = false;
    console.error('[WKD] Tower Planner failed to start from split files:', error);
    throw error;
  }
})();
