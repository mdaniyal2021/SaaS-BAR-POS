import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getUserFromRequest } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE      = 2 * 1024 * 1024 // 2 MB

export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file     = formData.get('image')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'No image provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, message: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ success: false, message: 'Image must be under 2 MB' }, { status: 400 })
  }

  const ext      = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir      = path.join(process.cwd(), 'public', 'uploads', 'products')

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  return NextResponse.json({ success: true, url: `/uploads/products/${filename}` })
}
