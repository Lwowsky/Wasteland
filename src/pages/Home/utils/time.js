export function getCountdown(target, now) {
  if (!target) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const difference = new Date(target).getTime() - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),

    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),

    minutes: Math.floor((difference / (1000 * 60)) % 60),

    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function getTimeAgo(date, now, copy) {
  const time = new Date(date).getTime();
  const diff = Math.max(0, Math.floor((now - time) / 1000));

  if (diff < 60) {
    return copy.justNow;
  }

  const minutes = Math.floor(diff / 60);

  if (minutes < 60) {
    return copy.minutes.replace("{{count}}", String(minutes));
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return copy.hours.replace("{{count}}", String(hours));
  }

  const days = Math.floor(hours / 24);
  return copy.days.replace("{{count}}", String(days));
}
