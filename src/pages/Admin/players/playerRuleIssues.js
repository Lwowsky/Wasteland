export function getPlayerRuleIssues(player, registrationSettings = {}) {
  const issues = [];
  const availableTiers = registrationSettings.availableTiers || {};
  const availableShifts = registrationSettings.availableShifts || {};

  if (player?.tier && availableTiers[player.tier] !== true) {
    issues.push({ type: "tier", value: player.tier });
  }

  if (player?.shift && availableShifts[player.shift] !== true) {
    issues.push({ type: "shift", value: player.shift });
  }

  return issues;
}

