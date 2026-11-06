
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Circle,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { supabase } from '../lib/supabase'
import { getPointsForAttempts } from '../utils/scoring'
import Navbar from '../components/Navbar'




const CENTER = [41.5705, 1.8287]



const INITIAL_ZOOM = 17
const MAX_ZOOM = 22

function hasLocation(item) {
  const lat = Number(item.latitude)
  const lng = Number(item.longitude)

  return (
    item.latitude != null &&
    item.longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

// Controlar el zoom dels marcadors
function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom())
    },
  })

  return null
}

function getMarkerSize(zoom) {
  if (zoom <= 15) return 9
  if (zoom === 16) return 11
  if (zoom === 17) return 12
  if (zoom === 18) return 16
  if (zoom === 19) return 22
  if (zoom === 20) return 28
  if (zoom === 21) return 34
  return 36
}

// Marcador numerat amb mida adaptativa
function createNumberIcon(problem, zoom) {
  const premium = problem.is_premium === true
  const background = premium ? '#eab308' : '#e85d04'
  const border = premium ? '#a16207' : '#9a3412'

  const n = Number(problem.number)
  const label = Number.isFinite(n) ? String(n) : '?'

  const size = getMarkerSize(zoom)
  const fontSize = Math.max(7, Math.round(size * 0.42))
  const radius = Math.max(3, Math.round(size * 0.22))

  return divIcon({
    className: 'boulder-number-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
    html: `
      <div style="
        width:44px;
        height:44px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        touch-action:manipulation;
      ">
        <div style="
          width:${size}px;
          height:${size}px;
          display:flex;
          align-items:center;
          justify-content:center;
          box-sizing:border-box;
          background:${background};
          color:white;
          border:1px solid ${border};
          border-radius:${radius}px;
          font-size:${fontSize}px;
          font-weight:800;
          box-shadow:0 1px 3px rgba(0,0,0,0.22);
          pointer-events:none;
        ">
          ${label}
        </div>
      </div>
    `,
  })
}

// Seguiment de la posició al mapa
function GPSMapController({
  location,
  following,
  centerRequest,
  onManualMove,
}) {
  const map = useMap()
  const firstLocation = useRef(false)

  useMapEvents({
    dragstart() {
      onManualMove()
    },
  })

  // Moure el mapa amb el GPS quan seguim la posició
  useEffect(() => {
    if (!location || !following) return

    const target = [location.lat, location.lng]

    if (!firstLocation.current) {
      map.flyTo(target, Math.max(map.getZoom(), 18), {
        duration: 0.6,
      })
      firstLocation.current = true
    } else {
      map.panTo(target, { animate: true, duration: 0.4 })
    }
  }, [map, location, following])

  // Centrat manual amb el botó
  useEffect(() => {
    if (!location || centerRequest === 0) return

    map.flyTo(
      [location.lat, location.lng],
      Math.max(map.getZoom(), 18),
      { duration: 0.6 }
    )
  }, [map, centerRequest])

  return null
}

function directions(lat, lng) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  )
}

const buttonStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: 9,
  border: 'none',
  color: 'white',
  fontSize: 13,
  fontWeight: 'bold',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
}

// Informació completa del bloc
function BlockPopup({ problem, sectorName }) {
  const attempts = [
    { label: '1r', value: 1 },
    { label: '2n', value: 2 },
    { label: '3r', value: 3 },
    { label: '4t+', value: 4 },
  ]

  const blockUrl =
    `/problemes?bloc=${encodeURIComponent(problem.number)}`

  return (
    <div
      style={{
        width: 245,
        maxWidth: '75vw',
        maxHeight: '48vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        color: '#1a1a1a',
        paddingRight: 3,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 7,
      }}>
        <strong style={{ fontSize: 17 }}>
          Bloc #{problem.number}
        </strong>

        {problem.is_premium && (
          <span style={{
            background: '#fff3d6',
            color: '#9a5500',
            padding: '4px 6px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 'bold',
          }}>
            ⭐ PREMIUM
          </span>
        )}
      </div>

      <Link
        to={blockUrl}
        style={{
          display: 'block',
          fontSize: 16,
          fontWeight: 'bold',
          color: '#e85d04',
          textDecoration: 'underline',
          marginBottom: 9,
          lineHeight: 1.4,
          overflowWrap: 'anywhere',
        }}
      >
        {problem.name?.trim()
          ? problem.name
          : `Bloc #${problem.number}`}
        {' ↗'}
      </Link>

      <div style={{
        fontSize: 12,
        color: '#555',
        marginBottom: 9,
      }}>
        📍 <strong>Sector:</strong> {sectorName}
      </div>

      {(problem.grade || problem.modality) && (
        <div style={{
          fontSize: 12,
          marginBottom: 9,
          color: '#555',
        }}>
          {problem.grade && <strong>{problem.grade}</strong>}
          {problem.grade && problem.modality && ' · '}
          {problem.modality}
        </div>
      )}

      {problem.beta && (
        <div style={{
          background: '#f5f0eb',
          padding: 10,
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <strong style={{
            display: 'block',
            fontSize: 12,
            marginBottom: 5,
          }}>
            ℹ️ Explicació del bloc
          </strong>

          <div style={{
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}>
            {problem.beta}
          </div>
        </div>
      )}

      <div style={{
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 7,
      }}>
        🏆 Punts segons els intents
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 5,
        marginBottom: 10,
      }}>
        {attempts.map(item => {
          const points = getPointsForAttempts(
            problem,
            item.value
          )

          return (
            <div
              key={item.value}
              style={{
                background: '#f5f0eb',
                borderRadius: 7,
                padding: '8px 2px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: 10,
                color: '#666',
                marginBottom: 4,
              }}>
                {item.label}
              </div>

              <strong style={{
                fontSize: 13,
                color: '#e85d04',
              }}>
                {points == null ? '—' : points}
              </strong>
            </div>
          )
        })}
      </div>

      {problem.is_premium && (
        <p style={{
          fontSize: 10,
          color: '#777',
          lineHeight: 1.4,
          margin: '0 0 12px',
        }}>
          Punts base. El factor premium es calcula
          a la classificació.
        </p>
      )}

      <Link
        to={blockUrl}
        style={{
          ...buttonStyle,
          background: '#1a1a1a',
          marginBottom: 9,
        }}
      >
        🧗 Anar al bloc #{problem.number}
      </Link>

      <button
        type="button"
        onClick={() => directions(
          problem.latitude,
          problem.longitude
        )}
        style={{
          ...buttonStyle,
          background: '#e85d04',
        }}
      >
        📍 Com arribar-hi
      </button>
    </div>
  )
}

export default function MapPage() {
  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM)

  // Estat del GPS
  const [myLocation, setMyLocation] = useState(null)
  const [tracking, setTracking] = useState(false)
  const [following, setFollowing] = useState(true)
  const [centerRequest, setCenterRequest] = useState(0)
  const [gpsError, setGpsError] = useState('')
  const [gpsStarting, setGpsStarting] = useState(false)

  const watchIdRef = useRef(null)
  const mountedRef = useRef(true)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Carregar els blocs i sectors
  useEffect(() => {
    async function loadMapData() {
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
        setError('No s’han pogut carregar les dades del mapa.')
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [])

  // Aturar GPS en sortir de la pantalla
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  // Iniciar seguiment continu
  function startTracking() {
    if (!navigator.geolocation) {
      setGpsError('Aquest dispositiu no disposa de GPS.')
      return
    }

    if (watchIdRef.current !== null) return

    setGpsError('')
    setGpsStarting(true)
    setTracking(true)
    setFollowing(true)

    const id = navigator.geolocation.watchPosition(
      position => {
        if (!mountedRef.current) return

        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: new Date(),
        })

        setGpsStarting(false)
      },

      err => {
        if (!mountedRef.current) return

        console.error('Error GPS:', err)
        setGpsError('Error GPS: ' + err.message)
        setGpsStarting(false)
        setTracking(false)

        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000,
      }
    )

    watchIdRef.current = id
  }

  // Aturar seguiment manualment
  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setTracking(false)
    setGpsStarting(false)
    setFollowing(false)
    setGpsError('')
  }

  // Tornar a centrar el mapa
  function centerOnMe() {
    if (!myLocation) return

    setFollowing(true)
    setCenterRequest(previous => previous + 1)
  }

  const locatedProblems = problems.filter(hasLocation)
  const locatedSectors = sectors.filter(hasLocation)

  function getSectorName(problem) {
    const sector = sectors.find(
      s => String(s.id) === String(problem.sector_id)
    )

    return sector?.name || 'Sense sector assignat'
  }

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-2">
          🗺️ Mapa Boulder Urbà
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          Consulta els blocs i segueix la teva ubicació
          mentre et mous per la competició.
        </p>

        {/* CONTROLS GPS */}
        <div className="bg-white rounded-xl p-3 mb-4 space-y-2">
          {!tracking ? (
            <button
              onClick={startTracking}
              className="bg-blue-600 text-white font-bold px-4 py-3 rounded-xl w-full"
            >
              📍 Activar ubicació en directe
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-bold text-green-700">
                <span>●</span>
                {gpsStarting
                  ? 'Buscant senyal GPS...'
                  : 'Seguiment GPS activat'}
              </div>

              <button
                onClick={centerOnMe}
                disabled={!myLocation}
                className="bg-blue-600 text-white font-bold px-4 py-3 rounded-xl w-full disabled:opacity-50"
              >
                🎯 Centrar en la meva posició
              </button>

              <button
                onClick={stopTracking}
                className="bg-gray-200 text-gray-800 font-bold px-4 py-3 rounded-xl w-full"
              >
                ⏹ Aturar seguiment GPS
              </button>
            </>
          )}

          {gpsError && (
            <p role="alert" className="text-red-600 text-sm">
              {gpsError}
            </p>
          )}

          {myLocation && (
            <p className="text-xs text-gray-500">
              Precisió aproximada:{' '}
              {Math.round(myLocation.accuracy)} metres
              {' · '}
              {tracking
                ? following
                  ? 'El mapa segueix la teva posició'
                  : 'Mapa lliure: toca Centrar per seguir-te'
                : 'Última ubicació coneguda (GPS aturat)'}
            </p>
          )}
        </div>

        {loading && <p>Carregant mapa...</p>}

        {error && (
          <p className="text-red-600 mb-3">{error}</p>
        )}

        {!loading && !error && (
          <p className="text-sm text-gray-600 mb-3">
            {locatedSectors.length} sectors ubicats
            {' · '}
            {locatedProblems.length} blocs ubicats
          </p>
        )}

        {/* MAPA */}
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <MapContainer
            center={CENTER}
            zoom={INITIAL_ZOOM}
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

            <ZoomWatcher onZoomChange={setMapZoom} />

            <GPSMapController
              location={myLocation}
              following={following && tracking}
              centerRequest={centerRequest}
              onManualMove={() => setFollowing(false)}
            />

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
                    <strong>📍 {sector.name}</strong>

                    <button
                      type="button"
                      onClick={() => directions(
                        sector.latitude,
                        sector.longitude
                      )}
                      style={{
                        ...buttonStyle,
                        background: '#e85d04',
                        marginTop: 10,
                      }}
                    >
                      Com arribar-hi
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* BLOCS */}
            {locatedProblems.map(problem => (
              <Marker
                key={`problem-${problem.id}`}
                position={[
                  Number(problem.latitude),
                  Number(problem.longitude),
                ]}
                icon={createNumberIcon(problem, mapZoom)}
                keyboard={true}
                zIndexOffset={100}
              >
                <Popup
                  maxWidth={285}
                  minWidth={240}
                  autoPan={true}
                  keepInView={true}
                  autoPanPaddingTopLeft={[15, 15]}
                  autoPanPaddingBottomRight={[15, 15]}
                >
                  <BlockPopup
                    problem={problem}
                    sectorName={getSectorName(problem)}
                  />
                </Popup>
              </Marker>
            ))}

            {/* UBICACIÓ GPS BLAVA */}
            {myLocation && (
              <>
                <Circle
                  center={[myLocation.lat, myLocation.lng]}
                  radius={myLocation.accuracy}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.10,
                    weight: 1,
                  }}
                />

                <CircleMarker
                  center={[myLocation.lat, myLocation.lng]}
                  radius={9}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Tooltip permanent direction="top">
                    📍 Ets aquí
                  </Tooltip>

                  <Popup>
                    <strong>📍 La meva ubicació</strong>
                    <p>
                      Precisió aproximada:{' '}
                      {Math.round(myLocation.accuracy)} metres
                    </p>
                    {!tracking && (
                      <p>Última ubicació coneguda.</p>
                    )}
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        </div>

        {/* LLEGENDA */}
        <div className="flex flex-wrap gap-4 text-sm mt-4">
          <span>🔵 La meva ubicació</span>
          <span>🟠 Blocs normals</span>
          <span>🟡 Premium</span>
          <span>🔷 Sectors</span>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Pots moure el mapa lliurement per buscar blocs.
          Per tornar a la teva posició, prem Centrar.
        </p>

        <p className="text-xs text-gray-500 mt-2">
          El GPS pot consumir bateria. El seguiment
          s'atura quan surts d'aquesta pantalla.
          La teva ubicació no es guarda a Supabase.
        </p>
      </main>
    </div>
  )
}
