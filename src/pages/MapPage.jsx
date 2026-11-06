
import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Circle,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

// Centre inicial de Collbató
const CENTER = [41.5673977, 1.8281993]

export default function MapPage() {
  const [sectors, setSectors] = useState([])
  const [problems, setProblems] = useState([])
  const [myLocation, setMyLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMap() {
      try {
        const [sectorsResult, problemsResult] =
          await Promise.all([
            supabase.from('sectors').select('*'),
            supabase
              .from('problems')
              .select('*')
              .eq('active', true)
              .order('number'),
          ])

        if (sectorsResult.error) throw sectorsResult.error
        if (problemsResult.error) throw problemsResult.error

        setSectors(sectorsResult.data || [])
        setProblems(problemsResult.data || [])
      } catch (err) {
        console.error('Error carregant mapa:', err)
        setError('No s’han pogut carregar les dades del mapa.')
      } finally {
        setLoading(false)
      }
    }

    loadMap()
  }, [])

  function hasCoordinates(item) {
    return (
      item.latitude != null &&
      item.longitude != null &&
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude))
    )
  }

  function showMyLocation() {
    if (!navigator.geolocation) {
      alert('El dispositiu no permet geolocalització.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (err) => {
        console.error(err)
        alert('No s’ha pogut obtenir la ubicació. Revisa els permisos.')
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  function directions(lat, lng) {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lng}`

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const locatedSectors = sectors.filter(hasCoordinates)
  const locatedProblems = problems.filter(hasCoordinates)

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-2">
          🗺️ Mapa Boulder Urbà
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          Consulta els sectors i els blocs de la competició.
        </p>

        <button
          onClick={showMyLocation}
          className="bg-orange-600 text-white font-bold px-4 py-3 rounded-xl mb-4 w-full"
        >
          📍 Veure la meva ubicació
        </button>

        {loading && <p>Carregant mapa...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <p className="text-sm text-gray-600 mb-3">
            {locatedSectors.length} sectors ubicats ·{' '}
            {locatedProblems.length} blocs ubicats
          </p>
        )}

        <div className="rounded-xl overflow-hidden border border-gray-200">
          <MapContainer
  center={CENTER}
  zoom={17}
  minZoom={14}
  maxZoom={22}
  scrollWheelZoom={true}
  style={{ height: '70vh', minHeight: 450, width: '100%' }}
>
            <TileLayer
  attribution="&copy; OpenStreetMap contributors"
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  maxNativeZoom={19}
  maxZoom={22}
/>

            {/* Sectors: marcadors blaus */}
            {locatedSectors.map((sector) => (
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
                  <strong>📍 Sector: {sector.name}</strong>
                  <br />
                  <button
                    onClick={() =>
                      directions(sector.latitude, sector.longitude)
                    }
                  >
                    Com arribar-hi
                  </button>
                </Popup>
              </CircleMarker>
            ))}

            {/* Blocs: taronja o premium en daurat */}
            {locatedProblems.map((problem) => (
              <CircleMarker
                key={`problem-${problem.id}`}
                center={[
                  Number(problem.latitude),
                  Number(problem.longitude),
                ]}
                radius={4}
                pathOptions={{
                  color: problem.is_premium ? '#b45309' : '#c2410c',
                  fillColor: problem.is_premium
                    ? '#facc15'
                    : '#f97316',
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <strong>Bloc #{problem.number}</strong>
                  <br />
                  {problem.is_premium ? '⭐ Premium' : 'Bloc normal'}
                  <br />
                  <button
                    onClick={() =>
                      directions(problem.latitude, problem.longitude)
                    }
                  >
                    Com arribar-hi
                  </button>
                </Popup>
              </CircleMarker>
            ))}

            {/* Ubicació actual: marcador verd */}
            {myLocation && (
              <>
                <Circle
                  center={[myLocation.lat, myLocation.lng]}
                  radius={myLocation.accuracy}
                  pathOptions={{
                    color: '#16a34a',
                    fillOpacity: 0.08,
                  }}
                />
                <CircleMarker
                  center={[myLocation.lat, myLocation.lng]}
                  radius={7}
                  pathOptions={{
                    color: '#15803d',
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    📍 Ets aquí
                    <br />
                    Precisió aproximada:{' '}
                    {Math.round(myLocation.accuracy)} metres
                  </Popup>
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

        <p className="text-xs text-gray-500 mt-4">
          Només es mostren els punts amb coordenades guardades.
          La teva ubicació no es guarda ni es comparteix.
        </p>
      </div>
    </div>
  )
}

