import { AuthModal } from "./components/Auth/AuthModal"
import { Boot } from "./components/Boot/Boot"
import { Garage } from "./components/Garage/Garage"
import { PitWall } from "./components/PitWall/PitWall"
import { useAppStore } from "./state/store"

function App() {
  const view = useAppStore((s) => s.view)

  return (
    <>
      {view === "boot" && <Boot />}
      {view === "garage" && <Garage />}
      {view === "pitwall" && <PitWall />}
      <AuthModal />
      <div className="crt-overlay" />
      <div className="crt-vignette" />
    </>
  )
}

export default App
