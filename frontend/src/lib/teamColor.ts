export function teamColor(team: string): string {
  const slug = team.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `var(--team-${slug}, var(--accent))`
}
