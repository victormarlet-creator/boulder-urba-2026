
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { participant, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const navStyle = (path) =>
    `text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
      isActive(path)
        ? 'bg-[var(--color-summit)] text-white'
        : 'text-gray-300 hover:text-white'
    }`

  return (
    <nav className="bg-[var(--color-rock)] text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 flex items-center justify-between gap-2">

        {/* LOGOTIP */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1 shrink-0"
        >
          <span className="text-sm sm:text-2xl font-display tracking-wide text-[var(--color-summit)]">
            ⛰️ COLLBATÓ
          </span>
        </Link>

        {/* MENÚ PRINCIPAL */}
        <div className="flex items-center gap-0.5 sm:gap-2">

          <Link
            to="/dashboard"
            className={navStyle('/dashboard')}
          >
            Inici
          </Link>

          <Link
            to="/problemes"
            className={navStyle('/problemes')}
          >
            Blocs
          </Link>

          {/* NOU BOTÓ MAPA */}
          <Link
            to="/mapa"
            className={navStyle('/mapa')}
          >
            Mapa
          </Link>

          <button
            type="button"
            onClick={logout}
            className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors px-1 sm:px-2 whitespace-nowrap"
          >
            Sortir
          </button>

        </div>
      </div>

      {/* INFORMACIÓ DEL PARTICIPANT */}
      {participant && (
        <div className="bg-[var(--color-rock-light)] px-4 py-1.5 text-center">
          <span className="text-xs text-gray-400">
            #{participant.dorsal}
            {' · '}
            <span className="text-white font-semibold">
              {participant.name}
            </span>
          </span>
        </div>
      )}
    </nav>
  )
}
