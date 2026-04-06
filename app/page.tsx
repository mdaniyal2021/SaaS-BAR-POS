import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    redirect('/login')
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error()

    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4)
    const payload = JSON.parse(atob(padded))

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      redirect('/login')
    }

    const role = payload.role
    if (role === 'cashier') redirect('/cashier/pos')
    if (role === 'superadmin') redirect('/superadmin/dashboard')
    redirect('/dashboard')

  } catch {
    redirect('/login')
  }
}
