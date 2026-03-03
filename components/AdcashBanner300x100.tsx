'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    aclib?: {
      runBanner: (options: { zoneId: string }) => void
    }
  }
}

let aclibLoadPromise: Promise<void> | null = null

function ensureAdcashLibrary(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.aclib?.runBanner) return Promise.resolve()
  if (aclibLoadPromise) return aclibLoadPromise

  aclibLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('aclib') as HTMLScriptElement | null

    if (existing) {
      if (window.aclib?.runBanner) {
        resolve()
        return
      }
      const onLoad = () => resolve()
      const onError = () => reject(new Error('Failed to load Adcash library'))
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'aclib'
    script.type = 'text/javascript'
    script.src = 'https://acscdn.com/script/aclib.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Adcash library'))
    document.head.appendChild(script)
  })

  return aclibLoadPromise
}

type AdcashBanner300x100Props = {
  slotKey: string
  className?: string
}

export function AdcashBanner300x100({ slotKey, className = '' }: AdcashBanner300x100Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const zoneId = process.env.NEXT_PUBLIC_ADCASH_BANNER_ZONE_ID || '11032670'

  useEffect(() => {
    let cancelled = false

    const renderBanner = async () => {
      if (!containerRef.current) return

      try {
        await ensureAdcashLibrary()
      } catch {
        return
      }

      if (cancelled || !containerRef.current) return

      containerRef.current.innerHTML = ''
      const runner = document.createElement('script')
      runner.type = 'text/javascript'
      runner.text = `aclib.runBanner({ zoneId: '${zoneId}' });`
      containerRef.current.appendChild(runner)
    }

    void renderBanner()

    return () => {
      cancelled = true
    }
  }, [slotKey, zoneId])

  return (
    <div className={`my-3 flex justify-center ${className}`}>
      <div
        ref={containerRef}
        className="w-[300px] h-[100px] overflow-hidden"
        aria-label="Sponsored banner"
      />
    </div>
  )
}

