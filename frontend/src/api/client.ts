import type {
  CompareResult,
  DriverInfo,
  RealLap,
  SessionInfo,
  SimulateRequest,
} from "./types"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string; device: string }>("/health"),
  sessions: () => request<SessionInfo[]>("/sessions"),
  drivers: (sessionId: string) =>
    request<DriverInfo[]>(`/sessions/${sessionId}/drivers`),
  driverLaps: (sessionId: string, driver: string) =>
    request<RealLap[]>(`/sessions/${sessionId}/drivers/${driver}/laps`),
  simulate: (body: SimulateRequest) =>
    request<CompareResult>("/strategy/simulate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}
