
import { useEffect, useState } from 'react'
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
} from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { supabase } from '../lib/supabase'
import { getPointsForAttempts } from '../utils/scoring'
import Navbar from '../components/Navbar'

const CENTER = [41.5673977, 1.8281993]
const MAX_ZOOM = 22

// Comprovar les coordenades
function hasLocation(item) {
  return (
    item.latitude != null &&
    item.longitude != null &&
    Number.isFinite(Number(item.latitude)) &&
    Number.isFinite(Number(item.longitude)) &&
    Number(item.latitude) >= -90 &&
    Number(item.latitude) <= 90 &&
    Number(item.longitude) >= -180 &&
    Number(item.longitude) <= 180
  )
}

// Crear marcador numerat fàcil de tocar amb el dit
function createNumberIcon(problem) {
  const premium = problem.is_premium === true

  const background = premium ? '#eab308' : '#e85d04'
  const border = premium ? '#a16207' : '#9a3412'

  const number = Number(problem.number)
  const label = Number.isFinite(number)
    ? String(number)
    : '?'

  return divIcon({
    className: 'boulder-number-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -23],
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
          width:38px;
          height:38px;
          display:flex;
          align-items:center;
          justify-content:center;
          box-sizing:border-box;
          background:${background};
          color:white;
          border:2px solid ${border};
          border-radius:10px;
          font-size:16px;
          font-weight:800;
          box-shadow:0 2px 7px rgba(0,0,0,0.3);
        ">
          ${label}
        </div>
      </div>
    `,
  })
}

// Centrar el mapa en la ubicació del participant
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

// Obrir Google Maps amb indicacions
function directions(lat, lng) {
  const url =
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${lat},${lng}`

  window.open(url, '_blank', 'noopener,noreferrer')
}

const buttonStyle = {
  display: 'block',
  width: '100%',
  padding: '11px 12px',
  boxSizing: 'border-box',
  borderRadius: 9,
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  fontSize: 13,
}

// Informació completa en clicar un número
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
      {/* Número i tipus de bloc */}
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

      {/* Nom clicable: menú habitual Blocs */}
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

      {/* Sector */}
      <div
        style={{
          fontSize: 12,
          color: '#555',
          marginBottom: 9,
        }}
      >
        📍 <strong>Sector:</strong> {sectorName}
      </div>

      {/* Grau i modalitat, si estan disponibles */}
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

      {/* Explicació */}
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

      {/* Puntuacions */}
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

      {/* Anar directament al menú Blocs */}
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

      {/* Indicacions */}
      <button
        type="button"
        onClick={() =>
          directions(problem.latitude, problem.longitude)
        }
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
  const [myLocation, setMyLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  // Carregar les dades de Supabase
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

  // Mostrar la ubicació pròpia
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
        console.error('Error GPS:', err)
        alert(
          'No hem pogut obtenir la teva ubicació. ' +
          'Revisa els permisos GPS.'
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

  // Nom del sector corresponent
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
          Toca el número d'un bloc per consultar
          la seva informació, puntuació i ubicació.
        </p>

        {/* Botó GPS */}
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

        {/* MAPA */}
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

            {/* SECTORS: PUNTS BLAUS */}
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

            {/* BLOCS: NÚMEROS GRANS I CLICABLES */}
            {locatedProblems.map(problem => (
              <Marker
                key={`problem-${problem.id}`}
                position={[
                  Number(problem.latitude),
                  Number(problem.longitude),
                ]}
                icon={createNumberIcon(problem)}
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

            {/* UBICACIÓ DEL PARTICIPANT */}
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
                  <Tooltip permanent direction="top">
                    Ets aquí
                  </Tooltip>

                  <Popup>
                    <strong>📍 La meva ubicació</strong>
                    <br />
                    Precisió aproximada:{' '}
                    {Math.round(myLocation.accuracy)} metres
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        </div>

        {/* LLEGENDA */}
        <div className="flex flex-wrap gap-4 text-sm mt-4">
          <span>🔵 Sectors</span>
          <span>🟠 Blocs normals</span>
          <span>🟡 Premium</span>
          <span>🟢 La meva ubicació</span>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Toca directament el requadre amb el número
          del bloc per desplegar-ne tota la informació.
        </p>

        <p className="text-xs text-gray-500 mt-2">
          Pots ampliar el mapa fins al zoom 22.
          La teva ubicació GPS no es guarda
          ni es comparteix.
        </p>
      </main>
    </div>
  )
}
