import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import AuthGate from "@/components/AuthGate"

function App() {
  return (
    <>
      <AuthGate>
        <Pages />
      </AuthGate>
      <Toaster />
    </>
  )
}

export default App 