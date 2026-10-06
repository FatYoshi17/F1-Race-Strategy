import { create } from "zustand"
import type { AuthResponse, AuthUser } from "../api/types"

const STORAGE_KEY = "pitwall.auth"

interface Persisted {
  token: string
  user: AuthUser
}

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

function save(value: Persisted | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage blocked (private mode etc.): session still works in memory
  }
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  modalOpen: boolean
  setSession: (res: AuthResponse) => void
  logout: () => void
  openModal: () => void
  closeModal: () => void
}

const initial = load()

export const useAuthStore = create<AuthState>((set) => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  modalOpen: false,
  setSession: (res) => {
    save({ token: res.access_token, user: res.user })
    set({ token: res.access_token, user: res.user, modalOpen: false })
  },
  logout: () => {
    save(null)
    set({ token: null, user: null })
  },
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}))
