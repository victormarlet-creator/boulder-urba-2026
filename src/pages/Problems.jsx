
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getPointsForAttempts } from '../utils/scoring'
import {
  addToOfflineQueue,
  syncOfflineQueue,
} from '../utils/offlineSync'
import Navbar from '../components/Navbar'
import ProblemCard from '../components/ProblemCard'

export default function Problems() {
  const { participant } = useAuth()

  // Número del bloc rebut des del mapa
  // Exemple: /problemes?bloc=14
  const [searchParams] = useSearchParams()
  const numeroSeleccionat = searchParams.get('bloc')

  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [ascentsMap, setAscentsMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [competitionOpen, setCompetitionOpen] = useState(true)

  // Carregar les dades del participant
  useEffect(() => {
    if (participant) {
      loadAll()
    }
  }, [participant])

  // Comprovació del bloc seleccionat.
  // IMPORTANT: només comparem el NÚMERO, no l'ID.
  const isSelectedBlock = (problem) => {
    if (!numeroSeleccionat) return false

    return (
      String(problem.number) ===
      String(numeroSeleccionat)
    )
  }

  // Desplaçar-se automàticament fins al bloc
  useEffect(() => {
    if (loading || !numeroSeleccionat) return

    const bloc = problems.find(
      p =>
        String(p.number) ===
        String(numeroSeleccionat)
    )

    if (!bloc) return

    let cancelled = false
    let attempts = 0
    let timer

    function scrollToBlock() {
      if (cancelled) return

      const element = document.getElementById(
        `bloc-${bloc.id}`
      )

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      } else if (attempts < 10) {
        attempts += 1
        timer = setTimeout(scrollToBlock, 100)
      }
    }

    timer = setTimeout(scrollToBlock, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [loading, problems, numeroSeleccionat])

  // Carregar blocs, sectors, intents i configuració
  const loadAll = async () => {
    setLoading(true)

    try {
      // Configuració de la competició
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')

      const openSetting = settings?.find(
        s => s.key === 'competition_open'
      )

      setCompetitionOpen(
        openSetting?.value !== 'false'
      )

      // Carregar sectors
      const { data: sectorsData } = await supabase
        .from('sectors')
        .select('*')

      // Carregar blocs de la categoria corresponent
      const { data: problemsData } = await supabase
        .from('problems')
        .select('*')
        .eq('active', true)
        .or(
          `category_id.eq.${participant.category_id},category_id.is.null`
        )
        .order('number')

      // Carregar intents ja registrats
      const { data: ascentsData } = await supabase
        .from('ascents')
        .select('*')
        .eq('participant_id', participant.id)

      setSectors(sectorsData || [])
      setProblems(problemsData || [])

      // Crear mapa d'intents
      const map = {}

      for (const a of ascentsData || []) {
        map[a.problem_id] = a.attempts
      }

      setAscentsMap(map)

    } catch (err) {
      console.error(
        'Error carregant problemes:',
        err
      )
    } finally {
      setLoading(false)
    }
  }

  // Mostrar missatges
  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })

    setTimeout(() => {
      setToast(null)
    }, 2500)
  }

  // Registrar o eliminar intents
  const handleAttemptChange = async (
    problemId,
    attempts
  ) => {
    if (!competitionOpen) {
      showToast(
        'La competició està tancada.',
        'error'
      )
      return
    }

    const problem = problems.find(
      p => p.id === problemId
    )

    if (!problem || !participant) {
      showToast(
        'Error trobant el bloc o el participant.',
        'error'
      )
      return
    }

    setSaving(true)

    try {
      if (attempts === null) {
        // Eliminar ascens de la pantalla
        setAscentsMap(prev => {
          const next = { ...prev }
          delete next[problemId]
          return next
        })

        // Afegir eliminació a la cua offline
        addToOfflineQueue({
          action: 'delete',
          participant_id: participant.id,
          problem_id: problemId,
        })

        if (navigator.onLine) {
          await syncOfflineQueue()

          showToast('Bloc eliminat ✓')
        } else {
          showToast(
            'Sense cobertura. Canvi guardat offline.',
            'offline'
          )
        }

      } else {
        // Calcular puntuació
        const points = getPointsForAttempts(
          problem,
          attempts
        )

        // Actualitzar immediatament la pantalla
        setAscentsMap(prev => ({
          ...prev,
          [problemId]: attempts,
        }))

        // Afegir ascens a la cua offline
        addToOfflineQueue({
          action: 'upsert',
          participant_id: participant.id,
          problem_id: problemId,
          attempts,
          points_earned: points,
          topped: true,
        })

        if (navigator.onLine) {
          await syncOfflineQueue()

          showToast(
            `Bloc #${problem.number} guardat ✓`
          )
        } else {
          showToast(
            `Bloc #${problem.number} guardat offline. Se sincronitzarà quan torni la cobertura.`,
            'offline'
          )
        }
      }

    } catch (err) {
      console.error(
        'Error guardant:',
        err
      )

      showToast(
        'Error guardant. Torna-ho a intentar.',
        'error'
      )

    } finally {
      setSaving(false)
    }
  }

  // Agrupar blocs per sector
  const problemsBySector = sectors
    .map(sector => {
      const sectorProblems = problems
        .filter(
          p => p.sector_id === sector.id
        )
        .sort(
          (a, b) => a.number - b.number
        )

      return {
        sector,
        problems: sectorProblems,
        firstProblemNumber:
          sectorProblems.length > 0
            ? Math.min(
                ...sectorProblems.map(
                  p => p.number
                )
              )
            : 9999,
      }
    })
    .filter(
      group => group.problems.length > 0
    )
    .sort(
      (a, b) =>
        a.firstProblemNumber -
        b.firstProblemNumber
    )

  // Blocs sense sector
  const unassigned = problems.filter(
    p =>
      !p.sector_id ||
      !sectors.find(
        s => s.id === p.sector_id
      )
  )

  const totalDone = Object.keys(
    ascentsMap
  ).length

  // Mostrar cada bloc dins de la llista
  // Només ressaltem el número exacte
  const renderProblem = (problem) => {
    const selected = isSelectedBlock(problem)

    return (
      <div
        key={problem.id}
        id={`bloc-${problem.id}`}
        className={
          selected
            ? 'rounded-xl ring-4 ring-orange-500 ring-offset-2 mb-4'
            : 'mb-4'
        }
        style={{
          scrollMarginTop: '110px',
        }}
      >
        {selected && (
          <div className="bg-orange-500 text-white text-center font-bold text-sm py-2 rounded-t-xl">
            📍 Bloc seleccionat des del mapa
          </div>
        )}

        <ProblemCard
          problem={problem}
          currentAttempts={
            ascentsMap[problem.id] ?? null
          }
          onAttemptChange={
            handleAttemptChange
          }
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      {/* Missatges de confirmació */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999999] px-4 py-2 rounded-xl shadow-lg text-sm font-semibold transition-all max-w-[90vw] text-center ${
            toast.type === 'error'
              ? 'bg-[var(--color-danger)] text-white'
              : toast.type === 'offline'
                ? 'bg-[#f59e0b] text-[#111827]'
                : 'bg-[var(--color-green)] text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-lg mx-auto p-4">

        {/* Capçalera */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <div>
            <h1 className="font-display text-3xl text-[var(--color-rock)]">
              Blocs
            </h1>

            <p className="text-sm text-[var(--color-stone)]">
              {totalDone} de {problems.length} fets
            </p>
          </div>

          {!competitionOpen && (
            <span className="text-xs bg-[var(--color-rock)] text-white px-3 py-1 rounded-full">
              🏁 Tancada
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--color-stone)]">
            Carregant blocs...
          </div>
        ) : (
          <>
            {/* Llegenda */}
            <div className="card mb-4 py-3">
              <p className="text-xs text-[var(--color-stone)] font-semibold uppercase tracking-wide mb-2">
                Llegenda
              </p>

              <div className="flex gap-2 flex-wrap text-xs">
                <span className="bg-[var(--color-green)] text-white px-2 py-0.5 rounded-full">
                  1r intent
                </span>

                <span className="bg-[var(--color-green-light)] text-white px-2 py-0.5 rounded-full">
                  2n intent
                </span>

                <span className="bg-[var(--color-summit)] text-white px-2 py-0.5 rounded-full">
                  3r intent
                </span>

                <span className="bg-[var(--color-summit-light)] text-white px-2 py-0.5 rounded-full">
                  4t o +
                </span>

                <span className="badge-premium">
                  ⭐ Premium
                </span>
              </div>
            </div>

            {/* Blocs agrupats per sector */}
            {problemsBySector.map(
              ({
                sector,
                problems: sectorProblems,
              }) => (
                <div
                  key={sector.id}
                  className="mb-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />

                    <h2 className="font-display text-xl text-[var(--color-rock)] px-2">
                      {sector.name}
                    </h2>

                    <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                  </div>

                  {sectorProblems.map(
                    problem =>
                      renderProblem(problem)
                  )}
                </div>
              )
            )}

            {/* Blocs sense sector */}
            {unassigned.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />

                  <h2 className="font-display text-xl text-[var(--color-rock)] px-2">
                    Altres
                  </h2>

                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                </div>

                {unassigned.map(
                  problem =>
                    renderProblem(problem)
                )}
              </div>
            )}

            {/* Cap bloc disponible */}
            {problems.length === 0 && (
              <div className="text-center py-12 text-[var(--color-stone)]">
                No hi ha blocs disponibles per a la teva categoria.
              </div>
            )}

            {/* Bloc seleccionat no disponible */}
            {numeroSeleccionat &&
              problems.length > 0 &&
              !problems.some(
                isSelectedBlock
              ) && (
                <div className="card p-4 text-center text-sm text-[var(--color-stone)]">
                  El bloc seleccionat des del mapa
                  no està disponible per a la
                  teva categoria.
                </div>
              )}
          </>
        )}
      </div>
    </div>
  )
}
