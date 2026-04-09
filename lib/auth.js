import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
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
