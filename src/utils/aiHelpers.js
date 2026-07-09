export const AI_CACHE_KEY_PREFIX = 'pulsehr_ai_cache_'
export const AI_CACHE_EXPIRY_MS = 1000 * 60 * 60 * 24 // 24 hours

export function parseAiError(err) {
  const msg = err?.message || ''
  
  if (msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('invalid')) {
    return 'Invalid API key. Please check your Gemini API key.'
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait a moment and try again.'
  }
  if (msg.includes('503') || msg.includes('unavailable')) {
    return 'Service unavailable. The Gemini API is currently experiencing issues.'
  }
  if (msg.includes('timeout')) {
    return 'Request timed out. Please try again.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Please check your connection.'
  }
  return `AI Error: ${msg || 'Something went wrong.'}`
}

export async function withExponentialBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let retries = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      const msg = err?.message || ''
      // Don't retry on invalid keys
      if (msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('invalid')) {
        throw err
      }
      
      if (retries >= maxRetries) {
        throw err
      }
      
      const delay = baseDelay * Math.pow(2, retries) + Math.random() * 200 // Add jitter
      await new Promise(resolve => setTimeout(resolve, delay))
      retries++
    }
  }
}

export async function withTimeout(promise, timeoutMs = 15000) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timed out.'))
    }, timeoutMs)
  })
  
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

export function getCachedInsight(kind, dataStr) {
  try {
    const key = `${AI_CACHE_KEY_PREFIX}${kind}_${hashCode(dataStr)}`
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const { timestamp, content } = JSON.parse(cached)
    if (Date.now() - timestamp > AI_CACHE_EXPIRY_MS) {
      localStorage.removeItem(key)
      return null
    }
    return content
  } catch (e) {
    return null
  }
}

export function setCachedInsight(kind, dataStr, content) {
  try {
    const key = `${AI_CACHE_KEY_PREFIX}${kind}_${hashCode(dataStr)}`
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      content
    }))
  } catch (e) {
    // Ignore localStorage errors (e.g. quota exceeded)
  }
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}
