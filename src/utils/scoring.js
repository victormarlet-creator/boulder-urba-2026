/**
 * calculateParticipantScore
 *
 * Calcula la puntuació completa d'un participant.
 *
 * @param {Array}  ascents       - Llista d'ascents del participant (amb la info del problema inclosa)
 * @param {Array}  premiumRules  - Llista de regles premium de la taula premium_rules
 * @returns {Object} - { baseScore, completedProblems, premiumCompleted, premiumFactor, finalScore, firstTryCount }
 */
export function calculateParticipantScore(ascents = [], premiumRules = []) {
  // Només comptem els ascents on el participant ha completat el problema
  const completed = ascents.filter(a => a.topped === true)

  // Suma de punts guanyats
  const baseScore = completed.reduce((sum, a) => sum + (a.points_earned || 0), 0)

  // Nombre total de problemes completats
  const completedProblems = completed.length

  // Nombre de problemes Premium completats
  const premiumCompleted = completed.filter(a => a.problems?.is_premium === true).length

  // Nombre de problemes fets al primer intent
  const firstTryCount = completed.filter(a => a.attempts === 1).length

  // Buscar el factor multiplicador a premium_rules
  let premiumFactor = 1
  if (premiumRules.length > 0) {
    const rule = premiumRules.find(
      r => premiumCompleted >= r.min_premiums && premiumCompleted <= r.max_premiums
    )
    if (rule) {
      premiumFactor = parseFloat(rule.multiplier)
    }
  }

  // Puntuació final arrodonida
  const finalScore = Math.round(baseScore * premiumFactor)

  return {
    baseScore,
    completedProblems,
    premiumCompleted,
    premiumFactor,
    finalScore,
    firstTryCount,
  }
}

/**
 * getAttemptLabel
 * Retorna l'etiqueta llegible per als intents
 */
export function getAttemptLabel(attempts) {
  if (!attempts) return 'No fet'
  if (attempts === 1) return '1r intent'
  if (attempts === 2) return '2n intent'
  if (attempts === 3) return '3r intent'
  return '4t o més'
}

/**
 * getPointsForAttempts
 * Retorna els punts corresponents a un problema i nombre d'intents
 */
export function getPointsForAttempts(problem, attempts) {
  if (!problem || !attempts) return 0
  if (attempts === 1) return problem.points_1
  if (attempts === 2) return problem.points_2
  if (attempts === 3) return problem.points_3
  return problem.points_4plus
}
