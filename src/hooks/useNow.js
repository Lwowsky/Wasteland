import { useEffect, useState } from "react";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const delay = Math.max(250, Number(intervalMs) || 1000);
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, delay);

    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export default useNow;
