import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "./client"
import type { SimulateRequest } from "./types"

export function useSessions() {
  return useQuery({ queryKey: ["sessions"], queryFn: api.sessions })
}

export function useDrivers(sessionId: string | null) {
  return useQuery({
    queryKey: ["drivers", sessionId],
    queryFn: () => api.drivers(sessionId as string),
    enabled: !!sessionId,
  })
}

export function useDriverLaps(sessionId: string | null, driver: string | null) {
  return useQuery({
    queryKey: ["driverLaps", sessionId, driver],
    queryFn: () => api.driverLaps(sessionId as string, driver as string),
    enabled: !!sessionId && !!driver,
  })
}

export function useSimulate() {
  return useMutation({
    mutationFn: (body: SimulateRequest) => api.simulate(body),
  })
}
