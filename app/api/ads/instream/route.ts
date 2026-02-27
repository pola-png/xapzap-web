import { NextResponse } from 'next/server'

const DEFAULT_TIMEOUT_MS = 8000
const MAX_WRAPPER_DEPTH = 4

type VastPayload = {
  mediaUrl: string
  clickThroughUrl: string | null
  impressionUrls: string[]
  startTrackingUrls: string[]
  completeTrackingUrls: string[]
}

function stripCdata(input: string): string {
  const value = input
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim()
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractAll(xml: string, pattern: RegExp): string[] {
  const values: string[] = []
  const matcher = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  let match: RegExpExecArray | null = matcher.exec(xml)
  while (match) {
    const raw = (match[1] || '').trim()
    const value = stripCdata(raw)
    if (value) values.push(value)
    match = matcher.exec(xml)
  }
  return values
}

function extractFirst(xml: string, pattern: RegExp): string | null {
  const values = extractAll(xml, pattern)
  return values.length > 0 ? values[0] : null
}

function parseVast(xml: string): VastPayload | null {
  const mediaUrl =
    extractFirst(xml, /<MediaFile[^>]*type=['"]video\/mp4['"][^>]*>([\s\S]*?)<\/MediaFile>/i) ||
    extractFirst(xml, /<MediaFile[^>]*>([\s\S]*?)<\/MediaFile>/i)

  if (!mediaUrl) {
    return null
  }

  const clickThroughUrl = extractFirst(xml, /<ClickThrough[^>]*>([\s\S]*?)<\/ClickThrough>/i)
  const impressionUrls = extractAll(xml, /<Impression[^>]*>([\s\S]*?)<\/Impression>/gi)
  const startTrackingUrls = extractAll(xml, /<Tracking[^>]*event=['"]start['"][^>]*>([\s\S]*?)<\/Tracking>/gi)
  const completeTrackingUrls = extractAll(xml, /<Tracking[^>]*event=['"]complete['"][^>]*>([\s\S]*?)<\/Tracking>/gi)

  return {
    mediaUrl,
    clickThroughUrl,
    impressionUrls,
    startTrackingUrls,
    completeTrackingUrls,
  }
}

function extractWrapperUrl(xml: string): string | null {
  return extractFirst(xml, /<VASTAdTagURI[^>]*>([\s\S]*?)<\/VASTAdTagURI>/i)
}

function withCacheBuster(url: string): string {
  const cacheBuster = `${Date.now()}${Math.floor(Math.random() * 100000)}`
  return url
    .replace(/\[CACHEBUSTER\]/gi, cacheBuster)
    .replace(/\{\{cachebuster\}\}/gi, cacheBuster)
    .replace(/\{cachebuster\}/gi, cacheBuster)
}

async function fetchVastXml(url: string, signal: AbortSignal): Promise<string | null> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(withCacheBuster(url))
  } catch {
    return null
  }

  const response = await fetch(parsedUrl.toString(), {
    method: 'GET',
    signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/xml,text/xml,*/*',
    },
  })

  if (!response.ok) {
    return null
  }

  return await response.text()
}

async function resolveVastPayload(
  url: string,
  signal: AbortSignal,
  depth = 0
): Promise<VastPayload | null> {
  if (depth > MAX_WRAPPER_DEPTH) {
    return null
  }

  const xml = await fetchVastXml(url, signal)
  if (!xml) return null

  const ownImpressions = extractAll(xml, /<Impression[^>]*>([\s\S]*?)<\/Impression>/gi)
  const ownStartTracking = extractAll(xml, /<Tracking[^>]*event=['"]start['"][^>]*>([\s\S]*?)<\/Tracking>/gi)
  const ownCompleteTracking = extractAll(xml, /<Tracking[^>]*event=['"]complete['"][^>]*>([\s\S]*?)<\/Tracking>/gi)

  const inline = parseVast(xml)
  if (inline) {
    return {
      ...inline,
      impressionUrls: [...ownImpressions, ...inline.impressionUrls],
      startTrackingUrls: [...ownStartTracking, ...inline.startTrackingUrls],
      completeTrackingUrls: [...ownCompleteTracking, ...inline.completeTrackingUrls],
    }
  }

  const wrapperUrl = extractWrapperUrl(xml)
  if (!wrapperUrl) {
    return null
  }

  const nested = await resolveVastPayload(wrapperUrl, signal, depth + 1)
  if (!nested) {
    return null
  }

  return {
    mediaUrl: nested.mediaUrl,
    clickThroughUrl: nested.clickThroughUrl,
    impressionUrls: [...ownImpressions, ...nested.impressionUrls],
    startTrackingUrls: [...ownStartTracking, ...nested.startTrackingUrls],
    completeTrackingUrls: [...ownCompleteTracking, ...nested.completeTrackingUrls],
  }
}

export async function GET() {
  const rawTagUrl =
    process.env.ADCASH_VAST_URL ||
    process.env.NEXT_PUBLIC_ADCASH_VAST_URL ||
    ''

  const tagUrl = rawTagUrl.trim()
  if (!tagUrl) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    void new URL(tagUrl)
  } catch {
    return NextResponse.json(
      { error: 'Invalid ADCASH VAST URL configuration.' },
      { status: 400 }
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const parsed = await resolveVastPayload(tagUrl, controller.signal)
    if (!parsed) {
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json(parsed, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    const message =
      error?.name === 'AbortError'
        ? 'Ad request timed out.'
        : 'Failed to fetch ad from provider.'
    return NextResponse.json({ error: message }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
