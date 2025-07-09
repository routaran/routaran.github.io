import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useToast } from '../contexts/ToastContext'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { PlayDate } from '../types/database'
import * as playDatesApi from '../lib/supabase/playDates'

export function usePlayDates() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [playDates, setPlayDates] = useState<PlayDate[]>([])

  // Subscribe to real-time updates for play dates
  useRealtimeSubscription({
    table: 'play_dates',
    onInsert: () => loadPlayDates(),
    onUpdate: () => loadPlayDates(),
    onDelete: () => loadPlayDates()
  })

  const loadPlayDates = useCallback(async () => {
    try {
      setLoading(true)
      let data: PlayDate[]
      
      if (user) {
        // Get play dates where user is involved (organizer or player)
        data = await playDatesApi.getUserPlayDates(user.id)
      } else {
        // Get all play dates for visitors
        data = await playDatesApi.getPlayDates()
      }
      
      setPlayDates(data)
    } catch (error) {
      console.error('Error loading play dates:', error)
      showToast('Failed to load play dates', 'error')
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    loadPlayDates()
  }, [loadPlayDates])

  return {
    playDates,
    loading,
    reload: loadPlayDates
  }
}