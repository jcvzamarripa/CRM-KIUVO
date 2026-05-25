import { useState, useEffect } from 'react'

/**
 * Returns true when the browser reports an active network connection.
 * Listens to the native 'online' / 'offline' window events.
 */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return isOnline
}
