import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { syncOfflineQueue, getPendingCount } from './utils/offlineSync'
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
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(getPendingCount())
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    async function handleOnline() {
      setIsOnline(true)
      setSyncing(true)

      try {
        await syncOfflineQueue()
      } catch (error) {
        console.error('Error sincronitzant canvis pendents:', error)
      } finally {
        setPendingCount(getPendingCount())
        setSyncing(false)
      }
    }

    function handleOffline() {
      setIsOnline(false)
      setPendingCount(getPendingCount())
      setSyncing(false)
    }

    function refreshConnectionStatus() {
      if (navigator.onLine) {
        handleOnline()
      } else {
        handleOffline()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('focus', refreshConnectionStatus)
    document.addEventListener('visibilitychange', refreshConnectionStatus)

    refreshConnectionStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', refreshConnectionStatus)
      document.removeEventListener('visibilitychange', refreshConnectionStatus)
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        {!isOnline && (
          <div className="offline-banner">
            Sense cobertura. Els canvis es guardaran i se sincronitzaran automàticament.
          </div>
        )}

        {isOnline && syncing && (
          <div className="sync-banner">
            Sincronitzant canvis pendents...
          </div>
        )}

        {isOnline && !syncing && pendingCount > 0 && (
          <div className="sync-banner">
            {pendingCount} canvis pendents de sincronitzar.
          </div>
        )}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/problemes"
            element={
              <PrivateRoute>
                <Problems />
              </PrivateRoute>
            }
          />
          <Route path="/classificacio" element={<Classificacio />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
