import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import type { FormEvent } from "react"
import { api } from "../../api/client"
import { sfx } from "../../audio/sfx"
import { useAuthStore } from "../../state/auth"
import "./AuthModal.css"

export function AuthModal() {
  const open = useAuthStore((s) => s.modalOpen)
  const close = useAuthStore((s) => s.closeModal)
  const setSession = useAuthStore((s) => s.setSession)
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const auth = useMutation({
    mutationFn: () =>
      mode === "login" ? api.login(email, password) : api.register(email, password),
    onSuccess: (res) => {
      sfx.confirm()
      setSession(res)
      setPassword("")
    },
    onError: () => sfx.error(),
  })

  if (!open) return null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    auth.mutate()
  }

  return (
    <div className="auth-backdrop" onClick={close}>
      <form
        className="auth-modal panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="panel-title">
          {mode === "login" ? "PLAYER LOGIN" : "NEW PLAYER"}
        </div>
        <div className="auth-body">
          <label>
            EMAIL
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            PASSWORD {mode === "register" && <small>(8+ chars)</small>}
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {auth.isError && <div className="sim-error">{(auth.error as Error).message}</div>}
          <button className="arcade-btn primary" type="submit" disabled={auth.isPending}>
            {auth.isPending ? "..." : mode === "login" ? "▶ LOGIN" : "▶ CREATE ACCOUNT"}
          </button>
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              auth.reset()
              setMode(mode === "login" ? "register" : "login")
            }}
          >
            {mode === "login" ? "NO ACCOUNT? REGISTER" : "HAVE AN ACCOUNT? LOGIN"}
          </button>
          <button type="button" className="auth-switch" onClick={close}>
            CANCEL
          </button>
        </div>
      </form>
    </div>
  )
}
