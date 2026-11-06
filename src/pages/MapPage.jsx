
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const CENTER = [41.5673977, 1.8281993]
const MAX_ZOOM = 22

// Comprova que el bloc o sector té coordenades
function hasLocation(item) {
  return (
    item.latitude != null &&
    item.longitude != null &&
    Number.isFinite(Number(item.latitude)) &&
    Number.isFinite(Number(item.longitude))
  )
}

// Centra el mapa en la ubicació del participant
function FollowLocation({ location }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return

    map.flyTo(
      [location.lat, location.lng],
      Math.max(map.getZoom(), 19),
      { duration: 0.7 }
    )
  }, [map, location])

  return null
}

// Obrir indicacions a Google Maps
function directions(lat, lng) {
  const url =
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${lat},${lng}`

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function MapPage() {
  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  // Carregar sectors i blocs actius de Supabase
  useEffect(() => {
    async function loadMapData() {
      try {
        const [problemsResult, sectorsResult] =
          await Promise.all([
            supabase
              .from('problems')
              .select('*')
              .eq('active', true)
              .order('number'),

            supabase
              .from('sectors')
              .select('*'),
          ])

        if (problemsResult.error) {
          throw problemsResult.error
        }

        if (sectorsResult.error) {
          throw sectorsResult.error
        }

        setProblems(problemsResult.data || [])
        setSectors(sectorsResult.data || [])
      } catch (err) {
        console.error('Error carregant mapa:', err)
        setError(
          'No s’han pogut carregar les dades del mapa.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [])

  // Obtenir ubicació actual del participant
  function showMyLocation() {
    if (!navigator.geolocation) {
      alert('Aquest dispositiu no permet geolocalització.')
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      position => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })

        setLocating(false)
      },
      err => {
        console.error('Error GPS:', err)
        alert(
          'No hem pogut obtenir la teva ubicació. Revisa els permisos GPS.'
        )
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const locatedProblems = problems.filter(hasLocation)
  const locatedSectors = sectors.filter(hasLocation)

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-2">
          🗺️ Mapa Boulder Urbà
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          Consulta els sectors i els blocs de la competició.
          Clica el nom d'un bloc per anar directament
          al seu registre d'intents.
        </p>

        {/* UBICACIÓ DEL PARTICIPANT */}
        <button
          onClick={showMyLocation}
          disabled={locating}
          className="bg-orange-600 text-white font-bold px-4 py-3 rounded-xl mb-4 w-full"
        >
          {locating
            ? '📡 Buscant ubicació...'
            : '📍 Veure la meva ubicació'}
        </button>

        {loading && (
          <p className="text-sm mb-3">
            Carregant mapa...
          </p>
        )}

        {error && (
          <p className="text-red-600 mb-3">
            {error}
          </p>
        )}

        {!loading && !error && (
          <p className="text-sm text-gray-600 mb-3">
            {locatedSectors.length} sectors ubicats
            {' · '}
            {locatedProblems.length} blocs ubicats
          </p>
        )}

        {/* MAPA INTERACTIU */}
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <MapContainer
            center={CENTER}
            zoom={17}
            minZoom={13}
            maxZoom={MAX_ZOOM}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            style={{
              height: '70vh',
              minHeight: 450,
              width: '100%',
            }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxNativeZoom={19}
              maxZoom={MAX_ZOOM}
            />

            <FollowLocation location={myLocation} />

            {/* SECTORS */}
            {locatedSectors.map(sector => (
              <CircleMarker
                key={`sector-${sector.id}`}
                center={[
                  Number(sector.latitude),
                  Number(sector.longitude),
                ]}
                radius={6}
                pathOptions={{
                  color: '#1d4ed8',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.85,
                  weight: 1,
                }}
              >
                <Tooltip>
                  Sector: {sector.name}
                </Tooltip>

                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <strong style={{ fontSize: 15 }}>
                      📍 {sector.name}
                    </strong>

                    <button
                      onClick={() =>
                        directions(
                          sector.latitude,
                          sector.longitude
                        )
                      }
                      style={{
                        display: 'block',
                        marginTop: 10,
                        background: '#e85d04',
                        color: 'white',
                        padding: '9px 12px',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      📍 Com arribar-hi
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* BLOCS NORMALS I PREMIUM */}
            {locatedProblems.map(problem => (
              <CircleMarker
                key={`problem-${problem.id}`}
                center={[
                  Number(problem.latitude),
                  Number(problem.longitude),
                ]}
                radius={4}
                pathOptions={{
                  color: problem.is_premium
                    ? '#b45309'
                    : '#c2410c',
                  fillColor: problem.is_premium
                    ? '#facc15'
                    : '#f97316',
                  fillOpacity: 0.95,
                  weight: 1,
                }}
              >
                {/* Número visible sobre el marcador */}
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -3]}
                  opacity={1}
                >
                  <strong style={{ fontSize: 10 }}>
                    {problem.number}
                  </strong>
                </Tooltip>

                {/* Informació del bloc */}
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong style={{
                      display: 'block',
                      fontSize: 16,
                      marginBottom: 6,
                    }}>
                      Bloc #{problem.number}
                    </strong>

                    {/* NOM CLICABLE: MENÚ BLOCS */}
                    <Link
                      to={`/problemes?bloc=${encodeURIComponent(problem.number)}`}
                      style={{
                        display: 'block',
                        fontSize: 15,
                        fontWeight: 'bold',
                        color: '#e85d04',
                        textDecoration: 'underline',
                        marginTop: 8,
                        marginBottom: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {problem.name?.trim()
                        ? problem.name
                        : `Bloc #${problem.number}`}
                      {' ↗'}
                    </Link>

                    <div style={{
                      fontSize: 12,
                      marginBottom: 12,
                      color: '#4a4a4a',
                    }}>
                      {problem.is_premium
                        ? '⭐ Bloc Premium'
                        : '🧗 Bloc normal'}
                    </div>

                    {/* ACCÉS DIRECTE AL MENÚ BLOCS */}
                    <Link
                      to={`/problemes?bloc=${encodeURIComponent(problem.number)}`}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#1a1a1a',
                        color: 'white',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        textDecoration: 'none',
                        marginBottom: 8,
                      }}
                    >
                      🧗 Anar al bloc #{problem.number}
                    </Link>

                    {/* INDICACIONS */}
                    <button
                      onClick={() =>
                        directions(
                          problem.latitude,
                          problem.longitude
                        )
                      }
                      style={{
                        display: 'block',
                        padding: '9px 12px',
                        color: 'white',
                        background: '#e85d04',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      📍 Com arribar-hi
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* UBICACIÓ ACTUAL DEL PARTICIPANT */}
            {myLocation && (
              <>
                <Circle
                  center={[
                    myLocation.lat,
                    myLocation.lng,
                  ]}
                  radius={myLocation.accuracy}
                  pathOptions={{
                    color: '#16a34a',
                    fillColor: '#22c55e',
                    fillOpacity: 0.06,
                  }}
                />

                <CircleMarker
                  center={[
                    myLocation.lat,
                    myLocation.lng,
                  ]}
                  radius={7}
                  pathOptions={{
                    color: '#166534',
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Tooltip
                    permanent
                    direction="top"
                  >
                    Ets aquí
                  </Tooltip>

                  <Popup>
                    <strong>
                      📍 La meva ubicació
                    </strong>
                    <br />
                    Precisió aproximada:
                    {' '}
                    {Math.round(myLocation.accuracy)}
                    {' '}metres
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        </div>

        {/* LLEGENDA */}
        <div className="flex flex-wrap gap-4 text-sm mt-4">
          <span>🔵 Sectors</span>
          <span>🟠 Blocs</span>
          <span>🟡 Premium</span>
          <span>🟢 La meva ubicació</span>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Clica un punt del mapa per veure el bloc.
          Toca el seu nom per obrir-lo al menú Blocs.
        </p>

        <p className="text-xs text-gray-500 mt-2">
          Amplia el mapa amb els botons + i -.
          Només es mostren els punts amb coordenades
          guardades. La teva ubicació GPS no es guarda
          ni es comparteix.
        </p>
      </main>
    </div>
  )
}
