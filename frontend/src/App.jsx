import { Routes, Route, Navigate } from "react-router-dom"
import { isAuthenticated } from "./lib/supabase"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Coach from "./pages/Coach"
import CheckIn from "./pages/CheckIn"
import Analytics from "./pages/Analytics"

// Protected route — redirects to login if not authenticated
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/coach" element={
        <ProtectedRoute>
          <Coach />
        </ProtectedRoute>
      } />
      <Route path="/checkin" element={
        <ProtectedRoute>
          <CheckIn />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App