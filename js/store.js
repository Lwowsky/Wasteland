export function createStore(prefix) {
  const key = name => `${prefix}:${name}`;
  return {
    get(name, fallback = null) {
      try {
        const value = localStorage.getItem(key(name));
        return value ? JSON.parse(value) : fallback;
      } catch { return fallback; }
    },
    set(name, value) {
      localStorage.setItem(key(name), JSON.stringify(value));
    },
    remove(name) {
      localStorage.removeItem(key(name));
    }
  };
}
