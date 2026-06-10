import { supabase } from '../supabaseClient'

const QUEUE_KEY = 'pending_ascent_updates'

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function getPendingCount() {
  return getQueue().length
}

export function addToOfflineQueue(update) {
  const queue = getQueue()

  // Per cada participant + problema només guardem l'últim canvi
  const filtered = queue.filter(
    item =>
      !(
        item.participant_id === update.participant_id &&
        item.problem_id === update.problem_id
      )
  )

  filtered.push({
    ...update,
    updated_at: new Date().toISOString(),
  })

  saveQueue(filtered)
}

export async function syncOfflineQueue() {
  const queue = getQueue()

  if (queue.length === 0) {
    return {
      success: true,
      synced: 0,
      pending: 0,
    }
  }

  const stillPending = []
  let synced = 0

  for (const item of queue) {
    const { error } = await supabase
      .from('ascents')
      .upsert(
        {
          participant_id: item.participant_id,
          problem_id: item.problem_id,
          ascents: item.ascents,
          points: item.points,
          updated_at: item.updated_at,
        },
        {
          onConflict: 'participant_id,problem_id',
        }
      )

    if (error) {
      console.error('Error sincronitzant canvi offline:', error)
      stillPending.push(item)
    } else {
      synced++
    }
  }

  saveQueue(stillPending)

  return {
    success: stillPending.length === 0,
    synced,
    pending: stillPending.length,
  }
}
