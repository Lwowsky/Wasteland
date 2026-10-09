function createEmptyTower({ troopType = null } = {}) {
  return {
    troopType,

    captain: null,

    players: [],
  };
}

export const MOCK_PLAN = {
  shift1: {
    hub: createEmptyTower({
      troopType: "fighter",
    }),

    north: createEmptyTower(),

    west: createEmptyTower(),

    east: createEmptyTower(),

    south: createEmptyTower(),
  },

  shift2: {
    hub: createEmptyTower(),

    north: createEmptyTower(),

    west: createEmptyTower(),

    east: createEmptyTower(),

    south: createEmptyTower(),
  },
};
