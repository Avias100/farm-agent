import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDuration } from '../lib/utils'

/**
 * Self-contained stopwatch hook.
 *
 * Usage:
 *   const timer = useTimer()
 *   timer.start()          → returns ISO start timestamp string
 *   timer.stop()           → returns ISO end timestamp string, stops interval
 *   timer.reset()          → clears all state
 *   timer.restoreFrom(iso) → resume timer from a past start time (app re-open)
 *   timer.isRunning        → boolean
 *   timer.elapsed          → integer seconds since start
 *   timer.formatted        → "HH:MM:SS" string
 *   timer.startedAt        → ISO string of when the timer was started
 */
export function useTimer() {
  const [isRunning,  setIsRunning]  = useState(false)
  const [startMs,    setStartMs]    = useState(null)   // epoch ms
  const [elapsed,    setElapsed]    = useState(0)      // seconds
  const intervalRef  = useRef(null)

  // Tick every second while running
  useEffect(() => {
    if (isRunning && startMs !== null) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startMs) / 1000))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, startMs])

  const start = useCallback(() => {
    const now = Date.now()
    setStartMs(now)
    setElapsed(0)
    setIsRunning(true)
    return new Date(now).toISOString()
  }, [])

  const stop = useCallback(() => {
    const now = new Date().toISOString()
    setIsRunning(false)
    return now
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setStartMs(null)
    setElapsed(0)
  }, [])

  /**
   * Resume timer from a past ISO timestamp (e.g. when the app was closed
   * while a task was In Progress and reopened by the worker).
   */
  const restoreFrom = useCallback((startTimeISO) => {
    if (!startTimeISO) return
    const ms = new Date(startTimeISO).getTime()
    setStartMs(ms)
    setElapsed(Math.floor((Date.now() - ms) / 1000))
    setIsRunning(true)
  }, [])

  return {
    isRunning,
    elapsed,
    formatted: formatDuration(elapsed),
    startedAt: startMs ? new Date(startMs).toISOString() : null,
    start,
    stop,
    reset,
    restoreFrom,
  }
}
