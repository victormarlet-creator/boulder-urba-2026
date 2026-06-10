import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getPointsForAttempts } from '../utils/scoring'
import { addToOfflineQueue, syncOfflineQueue } from '../utils/offlineSync'
import Navbar from '../components/Navbar'
import ProblemCard from '../components/ProblemCard'

export default function Problems() {
  const { participant } = useAuth()
  const [problems, setProblems] = useState([])
  const [sectors, setSectors] = useState([])
  const [ascentsMap, setAscentsMap] = useState({}) // { problem_id: attempts }
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [competitionOpen, setCompetitionOpen] = useState(true)

  useEffect(() => {
    if (participant) {
      loadAll()
    }
  }, [participant])

  const loadAll = async () => {
    setLoading(true)

    try {
      // Carregar settings
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')

      const openSetting = settings?.find(s => s.key === 'competition_open')
      setCompetitionOpen(openSetting?.value !== 'false')

      // Carregar sectors
      const { data: sectorsData } = await supabase
        .from('sectors')
        .select('*')

      // Carregar problemes actius per a la categoria del participant o sense categoria
      const { data: problemsData } = await supabase
        .from('problems')
        .select('*')
        .eq('active', true)
        .or(`category_id.eq.${participant.category_id},category_id.is.null`)
        .order('number')

      // Carregar ascents actuals del participant
      const { data: ascentsData } = await supabase
        .from('ascents')
        .select('*')
        .eq('participant_id', participant.id)

      setSectors(sectorsData || [])
      setProblems(problemsData || [])

      // Construir mapa d'ascents: { problem_id: attempts }
      const map = {}
      for (const a of ascentsData || []) {
        map[a.problem_id] = a.attempts
      }

      setAscentsMap(map)
    } catch (err) {
      console.error('Error carregant problemes:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleAttemptChange = async (problemId, attempts) => {
    if (!competitionOpen) {
      showToast('La competició està tancada.', 'error')
      return
    }

    const problem = problems.find(p => p.id === problemId)

    if (!problem || !participant) {
      showToast('Error trobant el bloc o el participant.', 'error')
      return
    }

    setSaving(true)

    try {
      if (attempts === null) {
        // Actualitzar la pantalla immediatament
        setAscentsMap(prev => {
          const next = { ...prev }
          delete next[problemId]
          return next
        })

        // Guardar eliminació a la cua offline
        addToOfflineQueue({
          action: 'delete',
          participant_id: participant.id,
          problem_id: problemId,
        })

        // Si hi ha internet, sincronitzar ara
        if (navigator.onLine) {
          await syncOfflineQueue()
          showToast('Bloc eliminat ✓')
        } else {
          showToast('Bloc eliminat offline. Se sincronitzarà quan torni la cobertura.')
        }
      } else {
        // Calcular punts com fins ara
        const points = getPointsForAttempts(problem, attempts)

        // Actualitzar la pantalla immediatament
        setAscentsMap(prev => ({
          ...prev,
          [problemId]: attempts,
        }))

        // Guardar canvi a la cua offline
        addToOfflineQueue({
          action: 'upsert',
          participant_id: participant.id,
          problem_id: problemId,
          attempts,
          points_earned: points,
          topped: true,
        })

        // Si hi ha internet, sincronitzar ara
        if (navigator.onLine) {
          await syncOfflineQueue()
          showToast(`Bloc #${problem.number} guardat ✓`)
        } else {
          showToast(`Bloc #${problem.number} guardat offline. Se sincronitzarà quan torni la cobertura.`)
        }
      }
    } catch (err) {
      console.error('Error guardant:', err)
      showToast('Error guardant. Torna-ho a intentar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Agrupar problemes per sector i ordenar els sectors segons el primer número de problema
  const problemsBySector = sectors
    .map(sector => {
      const sectorProblems = problems
        .filter(p => p.sector_id === sector.id)
        .sort((a, b) => a.number - b.number)

      return {
        sector,
        problems: sectorProblems,
        firstProblemNumber: sectorProblems.length > 0
          ? Math.min(...sectorProblems.map(p => p.number))
          : 9999,
      }
    })
    .filter(g => g.problems.length > 0)
    .sort((a, b) => a.firstProblemNumber - b.firstProblemNumber)

  // Problemes sense sector assignat
  const unassigned = problems.filter(
    p => !p.sector_id || !sectors.find(s => s.id === p.sector_id)
  )

  const totalDone = Object.keys(ascentsMap).length

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.type === 'error' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-green)]'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-lg mx-auto p-4">
        {/* Capçalera */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <div>
            <h1 className="font-display text-3xl text-[var(--color-rock)]">Blocs</h1>
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
            {/* Llegenda d'intents */}
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

            {/* Sectors */}
            {problemsBySector.map(({ sector, problems: sectorProblems }) => (
              <div key={sector.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                  <h2 className="font-display text-xl text-[var(--color-rock)] px-2">
                    {sector.name}
                  </h2>
                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                </div>

                {sectorProblems.map(problem => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    currentAttempts={ascentsMap[problem.id] ?? null}
                    onAttemptChange={handleAttemptChange}
                    saving={saving}
                  />
                ))}
              </div>
            ))}

            {/* Sense sector */}
            {unassigned.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                  <h2 className="font-display text-xl text-[var(--color-rock)] px-2">
                    Altres
                  </h2>
                  <div className="h-px flex-1 bg-[var(--color-chalk-dark)]" />
                </div>

                {unassigned.map(problem => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    currentAttempts={ascentsMap[problem.id] ?? null}
                    onAttemptChange={handleAttemptChange}
                    saving={saving}
                  />
                ))}
              </div>
            )}

            {problems.length === 0 && (
              <div className="text-center py-12 text-[var(--color-stone)]">
                No hi ha blocs disponibles per a la teva categoria.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
