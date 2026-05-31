import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Problems from './pages/Problems'
import Classificacio from './pages/Classificacio'
import Admin from './pages/Admin'

function PrivateRoute({ children }) {
  const { participant } = useAuth()
  if (!participant) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/problemes" element={
          <PrivateRoute><Problems /></PrivateRoute>
        } />
        <Route path="/classificacio" element={<Classificacio />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
