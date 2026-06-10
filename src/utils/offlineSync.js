import { supabase } from '../lib/supabase'

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

  // Per cada participant + problema només guardem l'últim canvi pendent
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
    let error = null

    if (item.action === 'delete') {
      const result = await supabase
        .from('ascents')
        .delete()
        .eq('participant_id', item.participant_id)
        .eq('problem_id', item.problem_id)

      error = result.error
    } else {
      const result = await supabase
        .from('ascents')
        .upsert(
          {
            participant_id: item.participant_id,
            problem_id: item.problem_id,
            attempts: item.attempts,
            points_earned: item.points_earned,
            topped: true,
          },
          {
            onConflict: 'participant_id,problem_id',
          }
        )

      error = result.error
    }

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
