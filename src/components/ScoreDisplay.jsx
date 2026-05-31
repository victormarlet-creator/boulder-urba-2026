export default function ScoreDisplay({ score, category }) {
  const {
    baseScore = 0,
    completedProblems = 0,
    premiumCompleted = 0,
    premiumFactor = 1,
    finalScore = 0,
    firstTryCount = 0,
  } = score || {}

  return (
    <div className="card">
      <div className="text-center mb-4">
        <p className="text-sm text-[var(--color-stone)] font-semibold uppercase tracking-widest">Categoria</p>
        <p className="font-display text-xl text-[var(--color-rock)]">{category || '—'}</p>
      </div>

      {/* Puntuació final destacada */}
      <div className="bg-[var(--color-rock)] rounded-xl p-4 text-center mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Puntuació Final</p>
        <p className="font-display text-5xl text-[var(--color-summit)]">{finalScore}</p>
      </div>

      {/* Stats en graella */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Blocs fets" value={completedProblems} />
        <StatBox label="1r intent" value={firstTryCount} color="green" />
        <StatBox label="Punts base" value={baseScore} />
        <StatBox
          label="Premium fets"
          value={premiumCompleted}
          color="premium"
          suffix={`× ${premiumFactor}`}
        />
      </div>
    </div>
  )
}

function StatBox({ label, value, color, suffix }) {
  const colorClass = {
    green: 'text-[var(--color-green)]',
    premium: 'text-[var(--color-premium)]',
  }[color] || 'text-[var(--color-rock)]'

  return (
    <div className="bg-[var(--color-chalk)] rounded-xl p-3 text-center">
      <p className={`font-display text-3xl ${colorClass}`}>{value}</p>
      {suffix && <p className="text-xs text-[var(--color-premium)] font-bold">{suffix}</p>}
      <p className="text-xs text-[var(--color-stone)] mt-0.5">{label}</p>
    </div>
  )
}
