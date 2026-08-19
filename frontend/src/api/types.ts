export type Compound = "SOFT" | "MEDIUM" | "HARD"

export interface SessionInfo {
  id: string
  year: number
  event: string
  session: string
  label: string
}

export interface DriverInfo {
  driver: string
  team: string
}

export interface RealLap {
  Driver: string
  Team: string
  LapNumber: number
  Stint: number
  Compound: Compound
  tire_age: number
  lap_time_s: number
  TrackTemp: number
  AirTemp: number
  Humidity: number
  WindSpeed: number
  Pressure: number
  series_id: string
  time_idx: number
}

export interface StintPlan {
  compound: Compound
  laps: number
}

export interface Quantiles {
  p02: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  p98: number
}

export interface SimLap {
  lap: number
  compound: Compound
  tire_age: number
  is_actual: boolean
  is_pit_lap: boolean
  quantiles: Quantiles
  cumulative_time_s: number
}

export interface RolloutResult {
  driver: string
  team: string
  session_id: string
  context_laps: number
  pit_loss_s: number
  pit_loss_total_s: number
  total_time_s: number
  calibration_offset_s: number
  laps: SimLap[]
}

export interface DeltaPoint {
  lap: number
  delta_s: number
}

export interface CompareResult {
  primary: RolloutResult
  rival: RolloutResult | null
  delta: {
    series: DeltaPoint[]
    final_delta_s: number | null
    crossover_lap: number | null
  } | null
}

export interface SimulateRequest {
  session_id: string
  driver: string
  plan: StintPlan[]
  rival_plan?: StintPlan[] | null
  pit_loss_s?: number
}
