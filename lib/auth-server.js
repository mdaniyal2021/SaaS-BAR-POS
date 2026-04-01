import { cookies } from 'next/headers'
import { verifyToken } from './auth'

export async function getServerUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireRole(role) {
  const user = await getServerUser()
  if (!user) return null
  if (Array.isArray(role)) {
    return role.includes(user.role) ? user : null
  }
  return user.role === role ? user : null
}
