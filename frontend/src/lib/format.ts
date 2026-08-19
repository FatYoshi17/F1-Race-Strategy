export function formatRaceTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds - mins * 60
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`
}

export function formatDelta(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "-"
  return `${sign}${Math.abs(seconds).toFixed(2)}s`
}
