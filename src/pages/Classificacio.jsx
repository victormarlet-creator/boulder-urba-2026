import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calculateParticipantScore } from '../utils/scoring'

const CATEGORIES = [
  { id: null,       label: 'Totes' },
  { code: 'BARBE',    label: 'Vicenç Barbé' },
  { code: 'PUIGGROS', label: 'Bartomeu Puiggròs' },
  { code: 'ROMEU',    label: 'Carme Romeu' },
]

export default function Classificacio() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null) // null = totes
  const [categories, setCategories] = useState([])
  const [rankingPublic, setRankingPublic] = useState(false)

  useEffect(() => {
    loadRanking()
  }, [])

  const loadRanking = async () => {
    setLoading(true)
    try {
      // Comprovar si el rànquing és públic
      const { data: settings } = await supabase.from('settings').select('key, value')
      const pubSetting = settings?.find(s => s.key === 'ranking_public')
      const isPublic = pubSetting?.value === 'true'
      setRankingPublic(isPublic)

      if (!isPublic) {
        setLoading(false)
        return
      }

      // Carregar categories
      const { data: catsData } = await supabase.from('categories').select('*').order('sort_order')
      setCategories(catsData || [])

      // Carregar tots els participants actius
      const { data: participants } = await supabase
        .from('participants')
        .select('id, dorsal, name, category_id, categories(id, name, code)')
        .eq('active', true)

      // Carregar tots els ascents
      const { data: allAscents } = await supabase
        .from('ascents')
        .select('*, problems(is_premium, points_1, points_2, points_3, points_4plus)')
        .eq('topped', true)

      // Carregar regles premium
      const { data: premiumRules } = await supabase.from('premium_rules').select('*')

      // Calcular puntuació per a cada participant
      const ranked = (participants || []).map(p => {
        const pAscents = (allAscents || []).filter(a => a.participant_id === p.id)
        const score = calculateParticipantScore(pAscents, premiumRules || [])
        return {
          ...p,
          ...score,
          category_name: p.categories?.name || '',
          category_code: p.categories?.code || '',
        }
      })

      // Ordenar: finalScore > completedProblems > premiumCompleted > firstTryCount
      ranked.sort((a, b) => {
        if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
        if (b.completedProblems !== a.completedProblems) return b.completedProblems - a.completedProblems
        if (b.premiumCompleted !== a.premiumCompleted) return b.premiumCompleted - a.premiumCompleted
        return b.firstTryCount - a.firstTryCount
      })

      setRows(ranked)
    } catch (err) {
      console.error('Error carregant classificació:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === null
    ? rows
    : rows.filter(r => r.category_id === filter)

  // Afegir posició dins de categoria
  const withPosition = filtered.map((row, idx) => ({ ...row, position: idx + 1 }))

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      {/* Header */}
      <div className="bg-[var(--color-rock)] text-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="font-display text-3xl tracking-wider">⛰️ CLASSIFICACIÓ</h1>
          <p className="text-sm text-gray-400">Festa de la Muntanya de Collbató</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12 text-[var(--color-stone)]">Carregant classificació...</div>
        ) : !rankingPublic ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="font-display text-2xl text-[var(--color-rock)]">Classificació no disponible</h2>
            <p className="text-[var(--color-stone)] text-sm mt-2">La classificació s'activarà aviat.</p>
            <a href="/" className="btn-primary inline-block mt-6">← Tornar a l'inici</a>
          </div>
        ) : (
          <>
            {/* Filtres de categoria */}
            <div className="flex gap-2 flex-wrap mb-4 mt-2">
              {[{ id: null, name: 'Totes' }, ...(categories)].map(cat => (
                <button
                  key={cat.id ?? 'all'}
                  onClick={() => setFilter(cat.id ?? null)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    filter === (cat.id ?? null)
                      ? 'bg-[var(--color-rock)] text-white'
                      : 'bg-white text-[var(--color-stone)] border border-[var(--color-chalk-dark)] hover:border-[var(--color-stone)]'
                  }`}
                >
                  {cat.name ?? cat.id}
                </button>
              ))}
            </div>

            {/* Taula */}
            {withPosition.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-stone)]">No hi ha resultats.</div>
            ) : (
              <div className="space-y-2">
                {withPosition.map((row, idx) => (
                  <RankingRow key={row.id} row={row} isTop={idx < 3} />
                ))}
              </div>
            )}

            <div className="text-center mt-6">
              <button onClick={loadRanking} className="text-sm text-[var(--color-stone)] hover:text-[var(--color-rock)]">
                🔄 Actualitzar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RankingRow({ row, isTop }) {
  const medals = ['🥇', '🥈', '🥉']
  const medal = isTop ? medals[row.position - 1] : null

  return (
    <div className={`card py-3 px-4 ${isTop ? 'border-[var(--color-summit)] border-2' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 text-center">
          {medal
            ? <span className="text-2xl">{medal}</span>
            : <span className="font-display text-xl text-[var(--color-stone)]">{row.position}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-rock)] truncate">{row.name}</span>
            <span className="text-xs text-[var(--color-stone)]">#{row.dorsal}</span>
          </div>
          <div className="text-xs text-[var(--color-stone)]">{row.category_name}</div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-display text-2xl text-[var(--color-summit)]">{row.finalScore}</div>
          <div className="text-xs text-[var(--color-stone)]">pts</div>
        </div>
      </div>

      {/* Stats secundaris */}
      <div className="flex gap-4 mt-2 pt-2 border-t border-[var(--color-chalk-dark)] text-xs text-[var(--color-stone)]">
        <span>🧗 {row.completedProblems} blocs</span>
        <span>⭐ {row.premiumCompleted} premium</span>
        <span>📊 {row.baseScore} × {row.premiumFactor}</span>
        <span>1r: {row.firstTryCount}</span>
      </div>
    </div>
  )
}
