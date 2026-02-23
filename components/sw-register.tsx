'use client'

import * as React from 'react'

export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.error('Service worker registration failed:', err)
        })
    }
  }, [])

  return null
}
