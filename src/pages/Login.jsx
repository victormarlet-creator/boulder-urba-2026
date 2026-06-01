import { useState, useEffect } from 'react'
useEffect(() => {
  const savedDorsal = localStorage.getItem('boulder_dorsal') || ''
  const savedCode = localStorage.getItem('boulder_code') || ''

  setDorsal(savedDorsal)
  setCode(savedCode)
}, [])
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [dorsal, setDorsal] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!dorsal.trim() || !code.trim()) {
      setError("Introdueix el dorsal i el codi privat.")
      return
    }

 setLoading(true)
try {
  const cleanDorsal = dorsal.trim().toUpperCase()
  const cleanCode = code.trim().toUpperCase()

  const { data, error: dbError } = await supabase
  .from('participants')
  .select('id, dorsal, private_code, name, active, category_id, birth_year')
  .eq('dorsal', cleanDorsal)
  .eq('private_code', cleanCode)
  .maybeSingle()

      if (dbError) {
  console.error('Error Supabase login:', dbError)
  setError('Error de connexió amb Supabase: ' + dbError.message)
  return
}

if (!data) {
  setError('No trobo cap participant amb aquest dorsal i codi.')
  return
}

      if (!data.active) {
        setError("Aquest participant no està actiu. Consulta l'organització.")
        return
      }
if (!data.active) {
  setError("Aquest participant no està actiu. Consulta l'organització.")
  return
}

localStorage.setItem('boulder_dorsal', cleanDorsal)
localStorage.setItem('boulder_code', cleanCode)
      login({
        id: data.id,
        dorsal: data.dorsal,
        name: data.name,
        category_id: data.category_id,
        category_name: data.categories?.name || '',
      })
      navigate('/dashboard')
    } catch {
      setError("Error de connexió. Comprova la connexió a internet.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-rock)] flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">⛰️</div>
        <h1 className="font-display text-5xl text-white tracking-wider">BOULDER URBÀ</h1>
        <p className="text-[var(--color-chalk-dark)] text-sm mt-2">Festa de la Muntanya de Collbató</p>
      </div>

      {/* Formulari */}
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h2 className="font-display text-2xl text-[var(--color-rock)] mb-5">Identifica't</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Dorsal</label>
              <input
                type="text"
                value={dorsal}
                onChange={e => setDorsal(e.target.value)}
                placeholder="Ex: 042"
                className="input"
                autoCapitalize="off"
                autoCorrect="off"
                inputMode="text"
              />
            </div>

            <div>
              <label className="label">Codi privat</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="El teu codi secret"
                className="input"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base"
            >
              {loading ? 'Comprovant...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/classificacio"
              className="text-sm text-[var(--color-stone)] hover:text-[var(--color-summit)] transition-colors"
            >
              📊 Veure classificació pública
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
