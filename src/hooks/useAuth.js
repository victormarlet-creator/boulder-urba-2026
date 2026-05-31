import { useState, useEffect } from 'react'

const SESSION_KEY = 'boulder_participant'

/**
 * Hook per gestionar la sessió del participant.
 * Guarda les dades al localStorage del navegador (no cal servidor).
 */
export function useAuth() {
  const [participant, setParticipant] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = (participantData) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(participantData))
    setParticipant(participantData)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setParticipant(null)
  }

  return { participant, login, logout }
}
