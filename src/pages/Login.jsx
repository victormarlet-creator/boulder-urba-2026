import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const savedDorsal = localStorage.getItem('boulder_dorsal') || ''
    const savedCode = localStorage.getItem('boulder_code') || ''

    setDorsal(savedDorsal)
    setCode(savedCode)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!dorsal.trim() || !code.trim()) {
      setError('Introdueix el dorsal i el codi privat.')
      return
    }

    setLoading(true)

    try {
      const cleanDorsal = dorsal.trim().toUpperCase()
      const cleanCode = code.trim().toUpperCase()

      const { data, error: dbError } = await supabase
        .from('participants')
        .select('id,dorsal,private_code,name,active,category_id,birth_year')
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

      localStorage.setItem('boulder_dorsal', cleanDorsal)
      localStorage.setItem('boulder_code', cleanCode)

      login({
        id: data.id,
        dorsal: data.dorsal,
        name: data.name,
        category_id: data.category_id,
        category_name: '',
      })

      navigate('/dashboard')
    } catch (err) {
      console.error('Error login:', err)
      setError('Error de connexió. Comprova la connexió a internet.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSavedLogin = () => {
    localStorage.removeItem('boulder_dorsal')
    localStorage.removeItem('boulder_code')
    setDorsal('')
    setCode('')
    setError('')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Imatge de fons */}
     <div
  className="absolute inset-0 bg-cover scale-105"
  style={{
    backgroundImage: "url('/fons-login.jpg')",
    backgroundPosition: '100% 0%',
  }}
/>

   {/* Capa fosca més suau */}
<div className="absolute inset-0 bg-black/30" />

{/* Degradat inferior més suau */}
<div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/45" />

      {/* Contingut */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Capçalera */}
        <div className="text-center mb-8">
          <img
            src="/logo-boulder.png"
            alt="Boulder Urbà"
            className="w-24 h-24 object-contain mx-auto mb-4 drop-shadow-2xl"
          />

          <h1 className="font-display text-5xl text-white tracking-wider drop-shadow-2xl">
            BOULDER URBÀ
          </h1>

          <p className="text-white/90 text-sm mt-2 drop-shadow">
            Festa de la Muntanya de Collbató
          </p>
        </div>

        {/* Caixa login */}
        <div className="bg-black/45 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20">
          <h2 className="font-display text-2xl text-white mb-5">
            Identifica't
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Dorsal
              </label>
              <input
                type="text"
                value={dorsal}
                onChange={e => setDorsal(e.target.value)}
                placeholder="Ex: 042"
                className="w-full rounded-xl border border-white/25 bg-white/12 text-white placeholder-white/45 px-4 py-3 outline-none focus:border-[var(--color-summit)] focus:ring-2 focus:ring-[var(--color-summit)]/30"
                autoCapitalize="characters"
                autoCorrect="off"
                inputMode="text"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Codi privat
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="El teu codi secret"
                className="w-full rounded-xl border border-white/25 bg-white/12 text-white placeholder-white/45 px-4 py-3 outline-none focus:border-[var(--color-summit)] focus:ring-2 focus:ring-[var(--color-summit)]/30"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </div>

            {error && (
              <div className="bg-red-500/15 border border-red-300/40 text-red-100 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--color-summit)] hover:bg-orange-600 text-white font-bold py-3 px-4 shadow-lg shadow-black/30 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? 'Comprovant...' : 'Entrar'}
            </button>

            {(dorsal || code) && (
              <button
                type="button"
                onClick={handleClearSavedLogin}
                className="w-full text-xs underline text-white/75 hover:text-white mt-2"
              >
                Esborrar dorsal i codi guardats
              </button>
            )}
          </form>

          <div className="mt-5 pt-4 border-t border-white/15 text-center">
            <a
              href="/classificacio"
              className="text-sm text-white/85 hover:text-white transition-colors font-semibold"
            >
              📊 Veure classificació pública ›
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
