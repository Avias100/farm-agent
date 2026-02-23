import { useState, useEffect } from 'react'
import { supabase, FARM_ID } from '../lib/supabase'
import db from '../db/localDb'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Loads sections and people for the farm.
 *
 * Strategy (offline-first):
 *   1. Read immediately from IndexedDB (zero-latency, works offline).
 *   2. If online, fetch fresh data from Supabase and update the IndexedDB cache.
 *
 * This means:
 *   - First load (offline): uses cached data from previous session.
 *   - First load ever (no cache, offline): returns empty arrays — user sees
 *     a "No data cached yet" message.
 *   - First load ever (online): fetches from Supabase, populates cache.
 */
export function useFarmData() {
  const isOnline  = useOnlineStatus()
  const [sections,  setSections]  = useState([])
  const [people,    setPeople]    = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Step 1: load from IndexedDB on mount
  useEffect(() => {
    async function loadFromCache() {
      const [cachedSections, cachedPeople] = await Promise.all([
        db.sections.where('farm_id').equals(FARM_ID).sortBy('name'),
        db.people
          .where('farm_id').equals(FARM_ID)
          .filter((p) => p.active !== false)
          .sortBy('full_name'),
      ])
      setSections(cachedSections)
      setPeople(cachedPeople)
      setIsLoading(false)
    }
    loadFromCache()
  }, [])

  // Step 2: refresh from Supabase when online
  useEffect(() => {
    if (!isOnline) return

    async function refreshFromServer() {
      const [{ data: remoteSections }, { data: remotePeople }] = await Promise.all([
        supabase
          .from('sections')
          .select('id, farm_id, name, description, area_hectares, soil_type')
          .eq('farm_id', FARM_ID)
          .order('name'),
        supabase
          .from('people')
          .select('id, farm_id, full_name, role, active, phone')
          .eq('farm_id', FARM_ID)
          .eq('active', true)
          .order('full_name'),
      ])

      if (remoteSections?.length) {
        await db.sections.bulkPut(remoteSections)
        setSections(remoteSections)
      }

      if (remotePeople?.length) {
        await db.people.bulkPut(remotePeople)
        setPeople(remotePeople)
      }
    }

    refreshFromServer()
  }, [isOnline])

  return { sections, people, isLoading }
}
