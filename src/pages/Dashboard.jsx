import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { calculateParticipantScore } from '../utils/scoring'
import Navbar from '../components/Navbar'
import ScoreDisplay from '../components/ScoreDisplay'

export default function Dashboard() {
  const { participant } = useAuth()
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [competitionOpen, setCompetitionOpen] = useState(true)

  useEffect(() => {
    if (participant) {
      loadData()
    }
  }, [participant])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar ascents amb info dels problemes
      const { data: ascents } = await supabase
        .from('ascents')
        .select('*, problems(is_premium, points_1, points_2, points_3, points_4plus)')
        .eq('participant_id', participant.id)

      // Carregar regles premium
      const { data: premiumRules } = await supabase
        .from('premium_rules')
        .select('*')

      // Carregar settings
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')

      const openSetting = settings?.find(s => s.key === 'competition_open')
      setCompetitionOpen(openSetting?.value !== 'false')

      const calculated = calculateParticipantScore(ascents || [], premiumRules || [])
      setScore(calculated)
    } catch (err) {
      console.error('Error carregant dades:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      <Navbar />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Benvinguda */}
        <div className="pt-2">
          <p className="text-[var(--color-stone)] text-sm">Benvingut/da,</p>
          <h1 className="font-display text-4xl text-[var(--color-rock)]">{participant?.name}</h1>
          <p className="text-sm text-[var(--color-stone)]">
            Dorsal <strong>#{participant?.dorsal}</strong>
          </p>
        </div>

        {/* Avís si la competició està tancada */}
        {!competitionOpen && (
          <div className="bg-[var(--color-rock)] text-white rounded-xl p-4 text-sm text-center">
            🏁 La competició ha finalitzat. No es poden afegir nous ascents.
          </div>
        )}

        {/* Puntuació */}
        {loading ? (
          <div className="card text-center py-8 text-[var(--color-stone)]">
            Carregant puntuació...
          </div>
        ) : (
          <ScoreDisplay score={score} category={participant?.category_name} />
        )}

        {/* Botons d'accés ràpid */}
        {competitionOpen && (
          <Link to="/problemes" className="btn-primary w-full block text-center text-lg">
            🧗 Registrar blocs
          </Link>
        )}

        <Link
          to="/classificacio"
          className="btn-secondary w-full block text-center"
        >
          📊 Veure classificació
        </Link>

        <button
          onClick={loadData}
          className="w-full text-sm text-[var(--color-stone)] hover:text-[var(--color-rock)] transition-colors py-2"
        >
          🔄 Actualitzar puntuació
        </button>
      </div>
    </div>
  )
}
