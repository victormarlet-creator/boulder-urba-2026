import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { participant, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-[var(--color-rock)] text-white shadow-lg">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-display tracking-wider text-[var(--color-summit)]">⛰️ COLLBATÓ</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              isActive('/dashboard')
                ? 'bg-[var(--color-summit)] text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Inici
          </Link>
          <Link
            to="/problemes"
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              isActive('/problemes')
                ? 'bg-[var(--color-summit)] text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Blocs
          </Link>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sortir
          </button>
        </div>
      </div>

      {participant && (
        <div className="bg-[var(--color-rock-light)] px-4 py-1.5 text-center">
          <span className="text-xs text-gray-400">
            #{participant.dorsal} · <span className="text-white font-semibold">{participant.name}</span>
          </span>
        </div>
      )}
    </nav>
  )
}
