export function formatDuration(ms: number) {
  if (ms <= 0) {
    return "0m";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatEventType(type: string) {
  switch (type) {
    case "page_view":
      return "Page view";
    case "heartbeat":
      return "Active time";
    case "action":
      return "Action";
    case "session_end":
      return "Session ended";
    default:
      return type;
  }
}
