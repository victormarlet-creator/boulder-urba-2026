
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { supabase } from '../lib/supabase'
import { adminSupabase } from '../lib/adminSupabase'

const CENTER = [41.5673977, 1.8281993]

function hasLocation(item) {
  return (
    item.latitude != null &&
    item.longitude != null &&
    Number.isFinite(Number(item.latitude)) &&
    Number.isFinite(Number(item.longitude))
  )
}

// Detecta els clics sobre el mapa
function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        accuracy: null,
      })
    },
  })

  return null
}

// Mou el mapa fins al punt seleccionat
function MapCenter({ target }) {
  const map = useMap()

  useEffect(() => {
    if (!target) return

    map.flyTo(
      [target.lat, target.lng],
      Math.max(map.getZoom(), 17)
    )
  }, [map, target])

  return null
}

export default function AdminMapPage() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [kind, setKind] = useState('problem')
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(null)
  const [mapTarget, setMapTarget] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const items = kind === 'problem' ? problems : sectors

  const selected = items.find(
    item => String(item.id) === selectedId
  )

  // Carregar blocs i sectors
  async function loadData() {
    setLoading(true)
    setMessage('')

    try {
      const [p, s] = await Promise.all([
        supabase
          .from('problems')
          .select('*')
          .order('number'),

        supabase
          .from('sectors')
          .select('*')
          .order('name'),
      ])

      if (p.error) throw p.error
      if (s.error) throw s.error

      setProblems(p.data || [])
      setSectors(s.data || [])
    } catch (error) {
      console.error(error)
      setMessage('Error carregant les dades: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Inici de sessió amb Supabase Auth
  async function login(e) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')

    try {
      const { data, error } =
        await adminSupabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (error) throw error

      setUser(data.user)
      setPassword('')
      await loadData()
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoggingIn(false)
    }
  }

  async function logout() {
    await adminSupabase.auth.signOut()
    setUser(null)
    setDraft(null)
    setSelectedId('')
    setMessage('')
  }

  // Canviar entre blocs i sectors
  function changeKind(value) {
    setKind(value)
    setSelectedId('')
    setDraft(null)
    setMapTarget(null)
    setMessage('')
  }

  // Seleccionar un element
  function selectItem(value) {
    setSelectedId(value)
    setDraft(null)
    setMessage('')

    const item = items.find(
      x => String(x.id) === value
    )

    if (item && hasLocation(item)) {
      setMapTarget({
        lat: Number(item.latitude),
        lng: Number(item.longitude),
      })
    }
  }

  // Guardar coordenades provisionals
  function pickLocation(coords) {
    if (!selectedId) {
      setMessage('Primer selecciona un bloc o sector.')
      return
    }

    setDraft(coords)
    setMessage('Ubicació preparada. Prem Guardar per confirmar.')
  }

  // Obtenir ubicació GPS
  function captureGPS() {
    if (!selectedId) {
      setMessage('Primer selecciona un bloc o sector.')
      return
    }

    if (!navigator.geolocation) {
      setMessage('El dispositiu no disposa de geolocalització.')
      return
    }

    setGpsLoading(true)
    setMessage('Buscant ubicació GPS...')

    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }

        setDraft(coords)
        setMapTarget({ lat: coords.lat, lng: coords.lng })
        setMessage('Ubicació GPS obtinguda. Revisa-la abans de guardar.')
        setGpsLoading(false)
      },

      error => {
        setMessage('Error GPS: ' + error.message)
        setGpsLoading(false)
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    )
  }

  // Guardar a Supabase amb la funció protegida
  async function saveLocation() {
    if (!selected || !draft || saving) return

    const targetId = String(selected.id)
    const targetKind = kind
    const latitude = draft.lat
    const longitude = draft.lng

    setSaving(true)
    setMessage('Guardant ubicació...')

    try {
      const { error } = await adminSupabase.rpc(
        'save_map_location',
        {
          p_kind: targetKind,
          p_record_id: targetId,
          p_latitude: latitude,
          p_longitude: longitude,
        }
      )

      if (error) throw error

      // Actualitzar els marcadors del mapa
      if (targetKind === 'problem') {
        setProblems(previous =>
          previous.map(p =>
            String(p.id) === targetId
              ? { ...p, latitude, longitude }
              : p
          )
        )
      } else {
        setSectors(previous =>
          previous.map(s =>
            String(s.id) === targetId
              ? { ...s, latitude, longitude }
              : s
          )
        )
      }

      setDraft(null)
      setMessage('✅ Ubicació guardada correctament!')
    } catch (error) {
      console.error(error)
      setMessage('❌ Error guardant: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Pantalla de login
  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <form
          onSubmit={login}
          className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
        >
          <h1 className="text-2xl font-bold">
            🗺️ Editor privat del mapa
          </h1>

          <p className="text-sm text-gray-600">
            Accés exclusiu per a l'organització.
          </p>

          <input
            type="email"
            placeholder="Correu administrador"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input w-full"
          />

          <input
            type="password"
            placeholder="Contrasenya"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input w-full"
          />

          {loginError && (
            <p className="text-red-600 text-sm">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="btn-primary w-full"
          >
            {loggingIn ? 'Entrant...' : 'Entrar a l’editor'}
          </button>

          <Link
            to="/"
            className="block text-center text-sm text-gray-500"
          >
            Tornar a l'aplicació
          </Link>
        </form>
      </div>
    )
  }

  const locatedProblems = problems.filter(hasLocation)
  const locatedSectors = sectors.filter(hasLocation)

  return (
    <div className="min-h-screen bg-[#f5f0eb]">
      <header className="bg-[#1a1a1a] text-white p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-2">
          <div>
            <h1 className="font-bold text-xl">
              🗺️ Editor del mapa
            </h1>
            <p className="text-xs text-gray-300">
              Boulder Urbà · Organització
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            Sortir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Selecció del tipus */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-lg">
            1. Què vols ubicar?
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeKind('problem')}
              className={
                kind === 'problem'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              🧗 Blocs
            </button>

            <button
              onClick={() => changeKind('sector')}
              className={
                kind === 'sector'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
            >
              📍 Sectors
            </button>
          </div>

          <select
            value={selectedId}
            onChange={e => selectItem(e.target.value)}
            className="input w-full"
            disabled={loading}
          >
            <option value="">
              Selecciona {kind === 'problem' ? 'un bloc' : 'un sector'}
            </option>

            {items.map(item => (
              <option key={item.id} value={String(item.id)}>
                {kind === 'problem'
                  ? `Bloc ${item.number} — ${item.name || ''}`
                  : item.name}
                {hasLocation(item) ? ' ✅' : ' 📍 pendent'}
              </option>
            ))}
          </select>

          {selected && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <strong>
                {kind === 'problem'
                  ? `Bloc ${selected.number}`
                  : selected.name}
              </strong>
              <p>
                {hasLocation(selected)
                  ? '✅ Ja té ubicació guardada. La pots corregir.'
                  : '⚠️ Encara no té ubicació.'}
              </p>
            </div>
          )}
        </div>

        {/* Instruccions i GPS */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-lg">
            2. Marca la ubicació
          </h2>

          <p className="text-sm text-gray-600">
            Pots clicar directament sobre el mapa o situar-te
            físicament al bloc i capturar les coordenades GPS.
          </p>

          <button
            onClick={captureGPS}
            disabled={!selectedId || gpsLoading}
            className="btn-primary w-full"
          >
            {gpsLoading
              ? '📡 Buscant GPS...'
              : '📍 Utilitzar la meva ubicació GPS'}
          </button>
        </div>

        {/* Mapa interactiu */}
        <div className="rounded-xl overflow-hidden border-2 border-gray-200">
          <MapContainer
  center={CENTER}
  zoom={18}
  minZoom={15}
  maxZoom={22}
  scrollWheelZoom={true}
  doubleClickZoom={true}
  style={{
    height: '70vh',
    minHeight: 500,
    width: '100%',
  }}
>
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onPick={pickLocation} />
            <MapCenter target={mapTarget} />

            {/* Sectors */}
            {locatedSectors.map(s => (
              <CircleMarker
                key={`sector-${s.id}`}
                center={[Number(s.latitude), Number(s.longitude)]}
                radius={6}
                pathOptions={{
                  color: '#1d4ed8',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.85,
                }}
              />
            ))}

            {/* Blocs */}
            {locatedProblems.map(p => (
              <CircleMarker
                key={`problem-${p.id}`}
                center={[Number(p.latitude), Number(p.longitude)]}
                radius={4}
                pathOptions={{
                  color: p.is_premium ? '#b45309' : '#c2410c',
                  fillColor: p.is_premium ? '#facc15' : '#f97316',
                  fillOpacity: 0.95,
                }}
              />
            ))}

            {/* Punt provisional */}
            {draft && (
              <>
                {draft.accuracy != null && (
                  <Circle
                    center={[draft.lat, draft.lng]}
                    radius={draft.accuracy}
                    pathOptions={{
                      color: '#16a34a',
                      fillOpacity: 0.08,
                    }}
                  />
                )}

                <CircleMarker
                  center={[draft.lat, draft.lng]}
                  radius={7}
                  pathOptions={{
                    color: '#166534',
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <span>🔵 Sectors</span>
          <span>🟠 Blocs</span>
          <span>🟡 Premium</span>
          <span>🟢 Posició provisional</span>
        </div>

        {/* Confirmació de la ubicació */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-lg">
            3. Confirma i guarda
          </h2>

          {draft ? (
            <div className="text-sm bg-green-50 rounded-lg p-3">
              <p>
                Latitud: <strong>{draft.lat.toFixed(7)}</strong>
              </p>
              <p>
                Longitud: <strong>{draft.lng.toFixed(7)}</strong>
              </p>

              {draft.accuracy != null && (
                <p>
                  Precisió GPS aproximada:{' '}
                  {Math.round(draft.accuracy)} metres
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Selecciona un element i marca un punt al mapa.
            </p>
          )}

          <button
            onClick={saveLocation}
            disabled={!selected || !draft || saving}
            className="btn-primary w-full"
          >
            {saving
              ? 'Guardant...'
              : '💾 Guardar ubicació a Supabase'}
          </button>

          {draft && (
            <button
              onClick={() => {
                setDraft(null)
                setMessage('Posició provisional descartada.')
              }}
              className="btn-secondary w-full"
            >
              Cancel·lar posició provisional
            </button>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-semibold"
            >
              {message}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 text-sm space-y-2">
          <p className="font-bold">Estat del mapa</p>
          <p>
            🟠 Blocs ubicats: {locatedProblems.length} / {problems.length}
          </p>
          <p>
            🔵 Sectors ubicats: {locatedSectors.length} / {sectors.length}
          </p>
          <button
            onClick={loadData}
            className="btn-secondary w-full"
          >
            🔄 Actualitzar dades
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Les ubicacions GPS només es capturen quan prems el botó.
          No es guarda cap historial de moviments.
        </p>
      </main>
    </div>
  )
}
