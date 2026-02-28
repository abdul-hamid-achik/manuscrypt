import type { H3Event } from "h3"

const requestLog = new Map<string, number[]>()

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of requestLog) {
    const filtered = timestamps.filter((t) => now - t < 120_000)
    if (filtered.length === 0) {
      requestLog.delete(key)
    } else {
      requestLog.set(key, filtered)
    }
  }
}, 300_000)

export function checkRateLimit(
  event: H3Event,
  { maxRequests = 20, windowMs = 60_000 } = {},
) {
  // Only trust socket address directly — X-Forwarded-For is trivially spoofable
  // without a trusted reverse proxy. If behind a proxy, configure the proxy
  // to set a trusted header and validate it here.
  const ip = event.node.req.socket.remoteAddress || "unknown"

  const now = Date.now()
  const timestamps = requestLog.get(ip) ?? []
  const windowStart = now - windowMs
  const recent = timestamps.filter((t) => t >= windowStart)

  if (recent.length >= maxRequests) {
    throw createError({
      statusCode: 429,
      message: "Too many requests. Please try again later.",
    })
  }

  recent.push(now)
  requestLog.set(ip, recent)
}
