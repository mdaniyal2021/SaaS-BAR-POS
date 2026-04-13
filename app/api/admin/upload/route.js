import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE      = 5 * 1024 * 1024 // 5 MB (GHL allows up to 25 MB)

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
    return NextResponse.json(
      { success: false, message: 'Only JPEG, PNG, WebP, or GIF allowed' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_SIZE) {
    return NextResponse.json({ success: false, message: 'Image must be under 5 MB' }, { status: 400 })
  }

  const apiKey      = process.env.GHL_API_KEY
  const locationId  = process.env.GHL_LOCATION_ID
  const baseUrl     = process.env.GHL_API_BASE_URL || 'https://services.leadconnectorhq.com'

  if (!apiKey || !locationId) {
    console.error('GHL upload: GHL_API_KEY or GHL_LOCATION_ID env var is missing')
    return NextResponse.json(
      { success: false, message: 'Image upload service is not configured' },
      { status: 500 }
    )
  }

  // Build multipart/form-data for GHL API
  const ghlForm = new FormData()
  // GHL requires a Blob with the correct MIME type
  const blob = new Blob([buffer], { type: file.type })
  // Use a clean filename with timestamp to avoid collisions
  const ext      = file.name?.split('.').pop() || 'jpg'
  const filename = `product-${Date.now()}.${ext}`
  ghlForm.append('file', blob, filename)
  ghlForm.append('hosted', 'false')

  let ghlResponse
  try {
    ghlResponse = await fetch(`${baseUrl}/medias/upload-file`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version:        '2021-07-28',
        // Do NOT set Content-Type manually — fetch sets it with the boundary automatically
      },
      body: ghlForm,
    })
  } catch (err) {
    console.error('GHL upload network error:', err)
    return NextResponse.json(
      { success: false, message: 'Network error while uploading image' },
      { status: 500 }
    )
  }

  let ghlData
  try {
    ghlData = await ghlResponse.json()
  } catch {
    console.error('GHL upload: could not parse response, status:', ghlResponse.status)
    return NextResponse.json(
      { success: false, message: `Upload failed (HTTP ${ghlResponse.status})` },
      { status: 500 }
    )
  }

  if (!ghlResponse.ok) {
    console.error('GHL upload failed:', ghlData)
    return NextResponse.json(
      { success: false, message: ghlData?.message || `GHL upload failed (${ghlResponse.status})` },
      { status: 500 }
    )
  }

  // GHL returns the public URL — field name may be `url` or `fileUrl`
  const imageUrl = ghlData?.url || ghlData?.fileUrl || ghlData?.data?.url || ghlData?.data?.fileUrl

  if (!imageUrl) {
    console.error('GHL upload: no URL in response:', ghlData)
    return NextResponse.json(
      { success: false, message: 'Upload succeeded but no URL was returned' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, url: imageUrl })
}
