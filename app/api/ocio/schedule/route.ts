import { schedules, tasks } from "@trigger.dev/sdk/v3"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthenticatedMerchant(req: NextRequest): Promise<
  | { error: NextResponse }
  | { merchantId: string; token: string }
> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) }
  }

  const token = authHeader.slice(7)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("merchant_id")
    .eq("id", user.id)
    .single()

  if (!profile?.merchant_id) {
    return { error: NextResponse.json({ error: "Profilo non trovato" }, { status: 401 }) }
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("plan")
    .eq("id", profile.merchant_id)
    .single()

  if (!merchant || (merchant.plan as string).toLowerCase() !== "business") {
    return { error: NextResponse.json({ error: "Piano BUSINESS richiesto" }, { status: 403 }) }
  }

  return { merchantId: profile.merchant_id, token }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedMerchant(req)
  if ("error" in auth) return auth.error

  const { merchantId } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 })
  }

  const action = body.action as string | undefined

  if (action === "create") {
    const { data: config, error: configError } = await supabase
      .from("ocio_config")
      .select("google_maps_url")
      .eq("merchant_id", merchantId)
      .maybeSingle()

    if (configError) {
      return NextResponse.json({ error: "Errore lettura configurazione" }, { status: 500 })
    }

    if (!config?.google_maps_url) {
      return NextResponse.json(
        { error: "URL Google Maps non configurato" },
        { status: 400 }
      )
    }

    // Crea o aggiorna lo schedule ogni 6 ore
    let schedule
    try {
      schedule = await schedules.create({
        task: "ocio-review-scraper",
        cron: "0 */6 * * *",
        externalId: merchantId,
        deduplicationKey: `ocio-${merchantId}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Errore Trigger.dev: ${message}` },
        { status: 500 }
      )
    }

    // Salva schedule ID nel DB
    await supabase
      .from("ocio_config")
      .update({ trigger_schedule_id: schedule.id })
      .eq("merchant_id", merchantId)

    // Triggera immediatamente il primo scraping senza aspettare 6 ore
    try {
      await tasks.trigger("ocio-review-scraper", { merchantId })
    } catch (err) {
      // Non bloccare la risposta se il trigger immediato fallisce
      console.error("Immediate scrape trigger failed:", err)
    }

    return NextResponse.json({ success: true, scheduleId: schedule.id })
  }

  if (action === "cancel") {
    const { data: config, error: configError } = await supabase
      .from("ocio_config")
      .select("trigger_schedule_id")
      .eq("merchant_id", merchantId)
      .maybeSingle()

    if (configError) {
      return NextResponse.json({ error: "Errore lettura configurazione" }, { status: 500 })
    }

    const scheduleId = config?.trigger_schedule_id as string | null | undefined

    if (!scheduleId) {
      return NextResponse.json({ success: true })
    }

    try {
      await schedules.del(scheduleId)
    } catch {
      // Schedule potrebbe non esistere più su Trigger.dev
    }

    await supabase
      .from("ocio_config")
      .update({ trigger_schedule_id: null })
      .eq("merchant_id", merchantId)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Azione non valida" }, { status: 400 })
}
