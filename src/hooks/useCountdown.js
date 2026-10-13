import { useEffect, useState } from "react";

function normalizeSeconds(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function useCountdown({ active = true, seconds = 0, resetKey = "" } = {}) {
  const duration = normalizeSeconds(seconds);
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let intervalId;

    const resetTimer = window.setTimeout(() => {
      setSecondsLeft(duration);

      if (duration <= 0) {
        return;
      }

      intervalId = window.setInterval(() => {
        setSecondsLeft((current) => {
          if (current <= 1) {
            window.clearInterval(intervalId);
            intervalId = undefined;
            return 0;
          }

          return current - 1;
        });
      }, 1000);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [active, duration, resetKey]);

  return secondsLeft;
}

export default useCountdown;
