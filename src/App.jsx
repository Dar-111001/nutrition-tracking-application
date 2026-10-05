import Pages from "@/pages/index.jsx"
import AuthGate from "@/components/AuthGate"

function App() {
  return (
    <AuthGate>
      <Pages />
    </AuthGate>
  )
}

export default App
