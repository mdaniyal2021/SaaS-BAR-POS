import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function getTokenFromRequest(request) {
  // Extract token from cookie
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...v] = c.trim().split('=')
        return [key, v.join('=')]
      })
    )
    if (cookies.token) return cookies.token
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

export function getUserFromRequest(request) {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}
