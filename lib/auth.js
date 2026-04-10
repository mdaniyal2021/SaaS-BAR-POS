import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

// ── Startup validation — fail fast if secret is missing or insecure ──────────
if (!JWT_SECRET) {
  throw new Error('[auth] JWT_SECRET is not set. Add a strong random secret to .env.local')
}
if (JWT_SECRET.length < 32) {
  throw new Error('[auth] JWT_SECRET is too short. Use at least 32 random characters.')
}
if (JWT_SECRET === 'barpos_jwt_secret_key_change_this_in_production') {
  throw new Error('[auth] JWT_SECRET is the default insecure value. Generate a new secret and update .env.local')
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function getTokenFromRequest(request) {
  // Only accept tokens from httpOnly cookies — not Authorization headers.
  // Accepting Bearer tokens would allow API tools to call endpoints directly
  // without a browser session, increasing the attack surface.
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...v] = c.trim().split('=')
      return [key, v.join('=')]
    })
  )

  return cookies.token || null
}

export function getUserFromRequest(request) {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
