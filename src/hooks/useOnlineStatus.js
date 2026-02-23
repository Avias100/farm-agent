import { useState, useEffect } from 'react'

/**
 * Returns true when the browser reports an active network connection.
 * Listens to the window online/offline events and re-renders callers
 * whenever connectivity changes.
 *
 * Note: navigator.onLine = true does NOT guarantee internet access —
 * it only means the device is connected to a network. The sync hook
 * treats any Supabase fetch failure as "effectively offline" regardless.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return isOnline
}
