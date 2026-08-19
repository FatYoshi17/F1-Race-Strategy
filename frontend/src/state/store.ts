import { create } from "zustand"
import type { Compound, StintPlan } from "../api/types"

export type View = "boot" | "garage" | "pitwall"

interface AppState {
  view: View
  sessionId: string | null
  sessionLabel: string | null
  driver: string | null
  team: string | null
  plan: StintPlan[]
  rivalEnabled: boolean
  rivalPlan: StintPlan[]
  pitLossS: number

  goTo: (view: View) => void
  selectSession: (id: string, label: string) => void
  selectDriver: (driver: string, team: string) => void
  setPlan: (plan: StintPlan[]) => void
  addStint: (compound: Compound) => void
  removeStint: (index: number) => void
  updateStintLaps: (index: number, laps: number) => void
  updateStintCompound: (index: number, compound: Compound) => void
  toggleRival: () => void
  setRivalPlan: (plan: StintPlan[]) => void
  setPitLoss: (s: number) => void
  reset: () => void
}

const DEFAULT_PLAN: StintPlan[] = [
  { compound: "MEDIUM", laps: 12 },
  { compound: "HARD", laps: 15 },
]

const DEFAULT_RIVAL: StintPlan[] = [
  { compound: "MEDIUM", laps: 18 },
  { compound: "HARD", laps: 9 },
]

export const useAppStore = create<AppState>((set, get) => ({
  view: "boot",
  sessionId: null,
  sessionLabel: null,
  driver: null,
  team: null,
  plan: DEFAULT_PLAN,
  rivalEnabled: false,
  rivalPlan: DEFAULT_RIVAL,
  pitLossS: 22,

  goTo: (view) => set({ view }),
  selectSession: (sessionId, sessionLabel) =>
    set({ sessionId, sessionLabel, driver: null, team: null }),
  selectDriver: (driver, team) => set({ driver, team, view: "pitwall" }),
  setPlan: (plan) => set({ plan }),
  addStint: (compound) =>
    set({ plan: [...get().plan, { compound, laps: 10 }] }),
  removeStint: (index) =>
    set({ plan: get().plan.filter((_, i) => i !== index) }),
  updateStintLaps: (index, laps) =>
    set({
      plan: get().plan.map((s, i) => (i === index ? { ...s, laps } : s)),
    }),
  updateStintCompound: (index, compound) =>
    set({
      plan: get().plan.map((s, i) => (i === index ? { ...s, compound } : s)),
    }),
  toggleRival: () => set({ rivalEnabled: !get().rivalEnabled }),
  setRivalPlan: (rivalPlan) => set({ rivalPlan }),
  setPitLoss: (pitLossS) => set({ pitLossS }),
  reset: () =>
    set({
      view: "garage",
      sessionId: null,
      sessionLabel: null,
      driver: null,
      team: null,
      plan: DEFAULT_PLAN,
      rivalPlan: DEFAULT_RIVAL,
      rivalEnabled: false,
    }),
}))
