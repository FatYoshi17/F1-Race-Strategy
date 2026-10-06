import { useAuthStore } from "../state/auth"
import type {
  AuthResponse,
  CompareResult,
  DriverInfo,
  RealLap,
  SaveRunRequest,
  SavedRun,
  SessionInfo,
  SimulateRequest,
} from "./types"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

// FastAPI returns `detail` as a string for HTTPExceptions and as a list of
// {msg} objects for request-validation errors; flatten both to readable text.
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => String((d as { msg?: string }).msg ?? "").replace(/^Value error, /, ""))
      .filter(Boolean)
      .join("; ")
  }
  return `Request failed: ${status}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401 && token && !path.startsWith("/auth/login")) {
    // Token expired or revoked: drop the stale session.
    useAuthStore.getState().logout()
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(errorMessage(body, res.status))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) })

export const api = {
  health: () => request<{ status: string; device: string }>("/health"),
  sessions: () => request<SessionInfo[]>("/sessions"),
  drivers: (sessionId: string) =>
    request<DriverInfo[]>(`/sessions/${sessionId}/drivers`),
  driverLaps: (sessionId: string, driver: string) =>
    request<RealLap[]>(`/sessions/${sessionId}/drivers/${driver}/laps`),
  simulate: (body: SimulateRequest) => post<CompareResult>("/strategy/simulate", body),

  register: (email: string, password: string) =>
    post<AuthResponse>("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    post<AuthResponse>("/auth/login", { email, password }),

  listRuns: () => request<SavedRun[]>("/runs"),
  saveRun: (body: SaveRunRequest) => post<SavedRun>("/runs", body),
  deleteRun: (id: number) => request<void>(`/runs/${id}`, { method: "DELETE" }),
}
