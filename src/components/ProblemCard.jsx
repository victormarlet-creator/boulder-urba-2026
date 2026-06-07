import { useState } from 'react'
import { getPointsForAttempts } from '../utils/scoring'

const ATTEMPT_OPTIONS = [
  { value: null,  label: 'No fet',       pts: null },
  { value: 1,     label: '1r intent',    key: 'points_1' },
  { value: 2,     label: '2n intent',    key: 'points_2' },
  { value: 3,     label: '3r intent',    key: 'points_3' },
  { value: 4,     label: '4t o +',       key: 'points_4plus' },
]

const ACTIVE_STYLE = {
  null: 'attempt-btn attempt-btn-none',
  1:    'attempt-btn attempt-btn-1',
  2:    'attempt-btn attempt-btn-2',
  3:    'attempt-btn attempt-btn-3',
  4:    'attempt-btn attempt-btn-4',
}

export default function ProblemCard({ problem, currentAttempts, onAttemptChange, saving }) {
  const selected = currentAttempts ?? null
const [showImage, setShowImage] = useState(false)
const [showBeta, setShowBeta] = useState(false)

const hasImage = Boolean(problem.image_url)
const hasBeta = Boolean(problem.beta)

  return (
    <>
      <div className={`card mb-3 ${problem.is_premium ? 'border-[var(--color-premium)] border-2' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-2xl text-[var(--color-rock)]">#{problem.number}</span>
              {problem.name && (
                <span className="font-semibold text-sm text-[var(--color-rock)]">{problem.name}</span>
              )}
              {problem.is_premium && (
                <span className="badge-premium">⭐ PREMIUM</span>
              )}
            </div>

            <div className="flex gap-3 mt-1 text-xs text-[var(--color-stone)]">
              {problem.grade && <span className="font-bold">{problem.grade}</span>}
              {problem.modality && <span>{problem.modality}</span>}
            </div>

            {hasImage && (
              <button
                type="button"
                onClick={() => setShowImage(true)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-summit)] underline"
              >
                📷 Veure foto del bloc
              </button>
            )}
          </div>

          {selected !== null && (
            <div className="text-right">
              <p className="text-xs text-[var(--color-stone)]">Punts</p>
              <p className="font-display text-2xl text-[var(--color-summit)]">
                {getPointsForAttempts(problem, selected)}
              </p>
            </div>
          )}
        </div>

        {/* Botons d'intent */}
        <div className="flex gap-1.5 flex-wrap">
          {ATTEMPT_OPTIONS.map(opt => {
            const isSelected = selected === opt.value
            const pts = opt.key ? problem[opt.key] : null

            return (
              <button
                key={String(opt.value)}
                onClick={() => !saving && onAttemptChange(problem.id, opt.value)}
                disabled={saving}
                className={`attempt-btn ${
                  isSelected
                    ? ACTIVE_STYLE[opt.value] || 'attempt-btn attempt-btn-none'
                    : 'attempt-btn attempt-btn-inactive'
                } ${saving ? 'opacity-50 cursor-wait' : ''}`}
                style={{ minWidth: '60px' }}
              >
                <span className="block">{opt.label}</span>
                {pts !== null && (
                  <span className="block text-xs opacity-80">{pts}p</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {showImage && hasImage && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImage(false)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowImage(false)}
              className="absolute -top-12 right-0 text-white text-3xl font-bold"
              aria-label="Tancar imatge"
            >
              ×
            </button>

            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-3 bg-[var(--color-rock)] text-white">
                <p className="font-display text-xl">
                  #{problem.number} {problem.name}
                </p>
                <p className="text-sm opacity-90">
                  {problem.grade} {problem.modality ? `· ${problem.modality}` : ''}
                </p>
              </div>

              <img
                src={problem.image_url}
                alt={`Problema ${problem.number} - ${problem.name}`}
                className="w-full max-h-[75vh] object-contain bg-black"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
