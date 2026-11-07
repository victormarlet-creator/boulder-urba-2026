
import { useEffect, useMemo, useRef, useState } from 'react'
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

// CONFIGURACIÓ DEL MAPA
const CENTER = [41.5705, 1.8287]
const INITIAL_ZOOM = 16
const MAX_ZOOM = 22

// COLORS DELS SECTORS
const SECTOR_COLORS = [
  '#ea580c', // Taronja
  '#16a34a', // Verd
  '#9333ea', // Lila
  '#dc2626', // Vermell
  '#0891b2', // Turquesa
  '#db2777', // Rosa
  '#4f46e5', // Índigo
  '#65a30d', // Verd llima
  '#b45309', // Marró
  '#0f766e', // Verd fosc
  '#7c3aed', // Violeta
  '#be123c', // Granat
]

const PREMIUM_COLOR = '#eab308'
const UNKNOWN_COLOR = '#64748b'

// COMPROVAR COORDENADES
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

// DETECTAR CANVIS DE ZOOM
function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom())
    },
  })

  return null
}

// MIDA DELS MARCADORS SEGONS EL ZOOM
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

// CREAR MARCADOR NUMERAT AMB COLOR DEL SECTOR
function createNumberIcon(problem, zoom, sectorColor) {
  const premium = problem.is_premium === true

  const background = premium
    ? PREMIUM_COLOR
    : sectorColor

  const border = premium
    ? '#a16207'
    : '#ffffff'

  const number = Number(problem.number)
  const label = Number.isFinite(number)
    ? String(number)
    : '?'

  const size = getMarkerSize(zoom)
  const fontSize = Math.max(
    7,
    Math.round(size * 0.42)
  )
  const radius = Math.max(
    3,
    Math.round(size * 0.22)
  )

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
        box-sizing:border-box;
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
          line-height:1;
          white-space:nowrap;
          box-shadow:0 1px 3px rgba(0,0,0,0.22);
          pointer-events:none;
        ">
          ${label}
        </div>
      </div>
    `,
  })
}

// SEGUIMENT GPS AL MAPA
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

  useEffect(() => {
    if (!location || !following) return

    const target = [location.lat, location.lng]

    if (!firstLocation.current) {
      map.flyTo(
        target,
        Math.max(map.getZoom(), 18),
        { duration: 0.6 }
      )
      firstLocation.current = true
    } else {
      map.panTo(target, {
        animate: true,
        duration: 0.4,
      })
    }
  }, [map, location, following])

  useEffect(() => {
    if (!location || centerRequest === 0) return

    map.flyTo(
      [location.lat, location.lng],
      Math.max(map.getZoom(), 18),
      { duration: 0.6 }
    )
  }, [map, location?.lat, location?.lng, centerRequest])

  return null
}

// OBRIR INDICACIONS A GOOGLE MAPS
function directions(lat, lng) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank',
    'noopener,noreferrer'
  )
}

// ESTIL DELS BOTONS DEL POPUP
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

// INFORMACIÓ COMPLETA DEL BLOC
function BlockPopup({ problem, sectorName, sectorColor }) {
  const attempts = [
    { label: '1r', value: 1 },
    { label: '2n', value: 2 },
    { label: '3r', value: 3 },
    { label: '4t+', value: 4 },
  ]

  const blockUrl =
    `/problemes?bloc=${encodeURIComponent(problem.number)}`

  const displayColor = problem.is_premium
    ? PREMIUM_COLOR
    : sectorColor

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
      {/* NÚMERO I PREMIUM */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 7,
        }}
      >
        <strong style={{ fontSize: 17 }}>
          Bloc #{problem.number}
        </strong>

        {problem.is_premium && (
          <span
            style={{
              background: '#fff3d6',
              color: '#9a5500',
              padding: '4px 6px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            ⭐ PREMIUM
          </span>
        )}
      </div>

      {/* NOM CLICABLE */}
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

      {/* SECTOR AMB COLOR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 12,
          color: '#555',
          marginBottom: 9,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 4,
            background: sectorColor,
            flexShrink: 0,
          }}
        />
        <span>
          <strong>Sector:</strong> {sectorName}
        </span>
      </div>

      {/* GRAU I MODALITAT */}
      {(problem.grade || problem.modality) && (
        <div
          style={{
            fontSize: 12,
            marginBottom: 9,
            color: '#555',
          }}
        >
          {problem.grade && (
            <strong>{problem.grade}</strong>
          )}

          {problem.grade && problem.modality && ' · '}

          {problem.modality}
        </div>
      )}

      {/* EXPLICACIÓ */}
      {problem.beta && (
        <div
          style={{
            background: '#f5f0eb',
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <strong
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 5,
            }}
          >
            ℹ️ Explicació del bloc
          </strong>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {problem.beta}
          </div>
        </div>
      )}

      {/* PUNTUACIONS */}
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 12,
          marginBottom: 7,
        }}
      >
        🏆 Punts segons els intents
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 5,
          marginBottom: 10,
        }}
      >
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
              <div
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 4,
                }}
              >
                {item.label}
              </div>

              <strong
                style={{
                  fontSize: 13,
                  color: '#e85d04',
                }}
              >
                {points == null ? '—' : points}
              </strong>
            </div>
          )
        })}
      </div>

      {/* PREMIUM */}
      {problem.is_premium && (
        <p
          style={{
            fontSize: 10,
            color: '#777',
            lineHeight: 1.4,
            margin: '0 0 12px',
          }}
        >
          Punts base. El factor premium es calcula
          a la classificació.
        </p>
      )}

      {/* ACCÉS ALS BLOCS */}
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

      {/* GOOGLE MAPS */}
      <button
        type="button"
        onClick={() =>
          directions(
            problem.latitude,
            problem.longitude
          )
        }
        style={{
          ...buttonStyle,
          background: displayColor,
          color: problem.is_premium ? '#1a1a1a' : 'white',
        }}
      >
        📍 Com arribar-hi
      </button>
    </div>
  )
}

// PÀGINA PRINCIPAL DEL MAPA
export default function MapPage() {
  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM)

  // GPS
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

  // CARREGAR BLOCS I SECTORS
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
        setError(
          'No s’han pogut carregar les dades del mapa.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [])

  // COLORS ASSIGNATS ALS SECTORS
  const sortedSectors = useMemo(
    () =>
      [...sectors].sort((a, b) =>
        String(a.id).localeCompare(
          String(b.id),
          undefined,
          { numeric: true }
        )
      ),
    [sectors]
  )

  const sectorColorMap = useMemo(
    () =>
      Object.fromEntries(
        sortedSectors.map((sector, index) => [
          String(sector.id),
          SECTOR_COLORS[index % SECTOR_COLORS.length],
        ])
      ),
    [sortedSectors]
  )

  function getProblemColor(problem) {
    return (
      sectorColorMap[String(problem.sector_id)] ||
      UNKNOWN_COLOR
    )
  }

  function getSectorName(problem) {
    const sector = sectors.find(
      s => String(s.id) === String(problem.sector_id)
    )

    return sector?.name || 'Sense sector assignat'
  }

  // ATURAR GPS EN SORTIR DE LA PANTALLA
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        )
        watchIdRef.current = null
      }
    }
  }, [])

  // ACTIVAR GPS CONTINU
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
          navigator.geolocation.clearWatch(
            watchIdRef.current
          )
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

  // ATURAR GPS
  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      )
      watchIdRef.current = null
    }

    setTracking(false)
    setGpsStarting(false)
    setFollowing(false)
    setGpsError('')
  }

  // CENTRAR MAPA EN EL PARTICIPANT
  function centerOnMe() {
    if (!myLocation) return

    setFollowing(true)
    setCenterRequest(previous => previous + 1)
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
          Cada sector té un color diferent.
          Els blocs premium són grocs.
          Toca un número per veure'n la informació.
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
            <p
              role="alert"
              className="text-red-600 text-sm"
            >
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
                : 'Última ubicació coneguda'}
            </p>
          )}
        </div>

        {loading && <p>Carregant mapa...</p>}

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

            <ZoomWatcher
              onZoomChange={setMapZoom}
            />

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
                    <strong>
                      📍 {sector.name}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        directions(
                          sector.latitude,
                          sector.longitude
                        )
                      }
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

            {/* BLOCS AMB COLOR PER SECTOR */}
            {locatedProblems.map(problem => (
              <Marker
                key={`problem-${problem.id}`}
                position={[
                  Number(problem.latitude),
                  Number(problem.longitude),
                ]}
                icon={createNumberIcon(
                  problem,
                  mapZoom,
                  getProblemColor(problem)
                )}
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
                    sectorColor={getProblemColor(problem)}
                  />
                </Popup>
              </Marker>
            ))}

            {/* UBICACIÓ GPS DEL PARTICIPANT */}
            {myLocation && (
              <>
                <Circle
                  center={[
                    myLocation.lat,
                    myLocation.lng,
                  ]}
                  radius={myLocation.accuracy}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.10,
                    weight: 1,
                  }}
                />

                <CircleMarker
                  center={[
                    myLocation.lat,
                    myLocation.lng,
                  ]}
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
                      {Math.round(myLocation.accuracy)}
                      {' '}metres
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

        {/* LLEGENDA DE SECTORS */}
        <div className="bg-white rounded-xl p-4 mt-4">
          <h3 className="font-bold text-sm mb-3">
            🎨 Colors dels sectors
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedSectors.map(sector => (
              <div
                key={sector.id}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    background:
                      sectorColorMap[String(sector.id)],
                    borderRadius: 5,
                    flexShrink: 0,
                  }}
                />
                <span>{sector.name}</span>
              </div>
            ))}

            <div className="flex items-center gap-2 text-xs">
              <span
                style={{
                  width: 18,
                  height: 18,
                  background: PREMIUM_COLOR,
                  borderRadius: 5,
                  flexShrink: 0,
                }}
              />
              <span>⭐ Premium</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span
                style={{
                  width: 18,
                  height: 18,
                  background: '#2563eb',
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
              <span>La meva ubicació</span>
            </div>

            {problems.some(
              p => p.sector_id == null
            ) && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  style={{
                    width: 18,
                    height: 18,
                    background: UNKNOWN_COLOR,
                    borderRadius: 5,
                    flexShrink: 0,
                  }}
                />
                <span>Sense sector</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Els números són petits quan el mapa
          està allunyat i creixen amb el zoom.
          Els blocs del mateix sector comparteixen
          color, excepte els premium.
        </p>

        <p className="text-xs text-gray-500 mt-2">
          El GPS s'atura quan surts del mapa.
          La teva ubicació no es guarda a Supabase
          ni es comparteix.
        </p>
      </main>
    </div>
  )
}
