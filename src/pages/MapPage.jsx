
import { useEffect, useState } from 'react'
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

function hasLocation(item) {
  return item.latitude != null &&
    item.longitude != null &&
    Number.isFinite(Number(item.latitude)) &&
    Number.isFinite(Number(item.longitude))
}

function FollowLocation({ location }) {
  const map = useMap()

  useEffect(() => {
    if (location) {
      map.flyTo(
        [location.lat, location.lng],
        Math.max(map.getZoom(), 19)
      )
    }
  }, [map, location])

  return null
}

function directions(lat, lng) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  )
}

export default function MapPage() {
  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [p, s] = await Promise.all([
          supabase
            .from('problems')
            .select('*')
            .eq('active', true)
            .order('number'),
          supabase
            .from('sectors')
            .select('*'),
        ])

        if (p.error) throw p.error
        if (s.error) throw s.error

        setProblems(p.data || [])
        setSectors(s.data || [])
      } catch (err) {
        console.error(err)
        setError('No s’han pogut carregar les dades.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  function showMyLocation() {
    if (!navigator.geolocation) {
      alert('Aquest dispositiu no permet GPS.')
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
        console.error(err)
        alert('No hem pogut obtenir la ubicació.')
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
          Consulta els sectors i blocs de la competició.
        </p>

        <button
          onClick={showMyLocation}
          disabled={locating}
          className="bg-orange-600 text-white font-bold px-4 py-3 rounded-xl mb-4 w-full"
        >
          {locating
            ? '📡 Buscant ubicació...'
            : '📍 Veure la meva ubicació'}
        </button>

        {loading && <p>Carregant mapa...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <p className="text-sm text-gray-600 mb-3">
            {locatedSectors.length} sectors ubicats ·{' '}
            {locatedProblems.length} blocs ubicats
          </p>
        )}

        <div className="rounded-xl overflow-hidden border">
          <MapContainer
            center={CENTER}
            zoom={17}
            minZoom={13}
            maxZoom={22}
            scrollWheelZoom={true}
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
              maxZoom={22}
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
                }}
              >
                <Popup>
                  <strong>{sector.name}</strong>
                  <br />
                  <button
                    onClick={() => directions(
                      sector.latitude,
                      sector.longitude
                    )}
                  >
                    📍 Com arribar-hi
                  </button>
                </Popup>
              </CircleMarker>
            ))}

            {/* BLOCS */}
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
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -3]}
                >
                  <strong>{problem.number}</strong>
                </Tooltip>

                <Popup>
                  <div style={{ minWidth: 170 }}>
                    <strong style={{ fontSize: 16 }}>
                      Bloc #{problem.number}
                    </strong>

                    <div style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginTop: 8,
                      marginBottom: 8,
                      color: '#e85d04',
                    }}>
                      {problem.name?.trim()
                        ? problem.name
                        : 'Nom no disponible'}
                    </div>

                    <p style={{ margin: '6px 0 12px' }}>
                      {problem.is_premium
                        ? '⭐ Bloc Premium'
                        : '🧗 Bloc normal'}
                    </p>

                    <button
                      onClick={() => directions(
                        problem.latitude,
                        problem.longitude
                      )}
                      style={{
                        background: '#e85d04',
                        color: 'white',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        width: '100%',
                      }}
                    >
                      📍 Com arribar-hi
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* UBICACIÓ DEL PARTICIPANT */}
            {myLocation && (
              <>
                <Circle
                  center={[myLocation.lat, myLocation.lng]}
                  radius={myLocation.accuracy}
                  pathOptions={{
                    color: '#16a34a',
                    fillOpacity: 0.06,
                  }}
                />

                <CircleMarker
                  center={[myLocation.lat, myLocation.lng]}
                  radius={7}
                  pathOptions={{
                    color: '#166534',
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                  }}
                >
                  <Popup>📍 Ets aquí</Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        </div>

        <div className="flex flex-wrap gap-4 text-sm mt-4">
          <span>🔵 Sectors</span>
          <span>🟠 Blocs</span>
          <span>🟡 Premium</span>
          <span>🟢 La meva ubicació</span>
        </div>
      </main>
    </div>
  )
}
