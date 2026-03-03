import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthenticatedMerchantId(request: NextRequest): Promise<string | null> {
  const supabase = getSupabase()
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  return profile?.merchant_id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const merchantId = await getAuthenticatedMerchantId(request)
  if (!merchantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = params

  // Verify ownership
  const { data: existing } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Endpoint non trovato' }, { status: 404 })
  }

  const body = await request.json()
  const updateObj: Record<string, unknown> = {}

  if (typeof body.is_active === 'boolean') updateObj.is_active = body.is_active
  if (Array.isArray(body.events)) updateObj.events = body.events
  if (typeof body.url === 'string') updateObj.url = body.url

  const { data: updated, error } = await supabase
    .from('webhook_endpoints')
    .update(updateObj)
    .eq('id', id)
    .select('id, merchant_id, url, events, is_active, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const merchantId = await getAuthenticatedMerchantId(request)
  if (!merchantId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = params

  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('merchant_id', merchantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
