import { logger, task } from "@trigger.dev/sdk/v3"
import { createClient } from "@supabase/supabase-js"
import { sendTextMessage, formatPhoneIT } from "../lib/sendapp"

interface OcioConfig {
  place_name: string | null
  business_description: string | null
  reply_tone: "professional" | "warm" | "formal"
}

interface OcioReviewRow {
  id: string
  text: string | null
  rating: number | null
  author_name: string | null
  review_url: string | null
  alert_sent: boolean
}

interface AnalysisResult {
  sentiment: "positive" | "neutral" | "negative"
  score: number
  urgency: "low" | "medium" | "high" | "critical"
  themes: string[]
  is_fake: boolean
  fake_reason: string | null
  suggested_reply: string
}

async function analyzeReview(
  review: OcioReviewRow,
  config: OcioConfig | null,
  apiKey: string
): Promise<AnalysisResult> {
  const systemPrompt =
    "Sei un esperto di analisi delle recensioni online. Analizza la recensione e rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick."

  const businessContext =
    config?.business_description ?? config?.place_name ?? "attività locale"
  const replyTone = config?.reply_tone ?? "professional"
  const replyToneDesc =
    replyTone === "professional"
      ? "formale ma accessibile"
      : replyTone === "warm"
        ? "caldo e personale"
        : "molto formale"

  const reviewText =
    review.text == null || review.text.trim().length === 0
      ? "N/A"
      : review.text

  const userMessage = `Recensione da analizzare:
Rating: ${review.rating ?? "N/D"}/5
Testo: "${reviewText}"

Informazioni attività:
- Nome/descrizione: ${businessContext}
- Tono risposta desiderato: ${replyTone} (${replyToneDesc})

Regole:
- "themes": array di keyword brevi IN ITALIANO (max 4-5 parole singole, es. ["servizio", "attesa", "qualità"])
- "suggested_reply": scrivi nella STESSA LINGUA della recensione
- "is_fake": true SOLO se ci sono segnali chiari (testo generico copiato, non pertinente, pattern spam) — preferisci false in caso di dubbio
- "score": 1-10, intensità/impatto della recensione (non solo sentiment — es. review positiva molto entusiasta = 9, negativa grave = 9, positiva tiepida = 4)
- "urgency": "critical" solo per minacce legali/sanitarie/sicurezza, "high" per problemi gravi ripetuti, "medium" per insoddisfazione standard, "low" per feedback positivi/neutri

Rispondi SOLO con questo JSON (nessun testo extra):
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": 1-10,
  "urgency": "low" | "medium" | "high" | "critical",
  "themes": ["keyword1", "keyword2"],
  "is_fake": true | false,
  "fake_reason": "stringa esplicita o null",
  "suggested_reply": "testo risposta"
}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  const data = (await res.json()) as { content: Array<{ text: string }> }
  const responseText = data.content[0].text

  const cleaned = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
const parsed = JSON.parse(cleaned) as AnalysisResult

  return parsed
}

export const ocioAiAnalyzer = task({
  id: "ocio-ai-analyzer",
  maxDuration: 600,
  run: async (payload: { merchantId: string }) => {
    const { merchantId } = payload

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient<any, "public", any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch merchant config
    const { data: configData } = await supabase
      .from("ocio_config")
      .select("place_name, business_description, reply_tone")
      .eq("merchant_id", merchantId)
      .single()

    const config = configData as OcioConfig | null

    // Fetch unanalyzed reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("ocio_reviews")
      .select("id, text, rating, author_name, review_url, alert_sent")
      .eq("merchant_id", merchantId)
      .is("ai_analyzed_at", null)

    if (reviewsError) {
      throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
    }

    if (!reviews || reviews.length === 0) {
      logger.log("ocio-ai-analyzer: no unanalyzed reviews", { merchantId })
      return { merchantId, processed: 0, skipped: 0, errors: 0 }
    }

    const typedReviews = reviews as OcioReviewRow[]

    // Fetch alert config once before the loop (reduces per-review DB queries)
    const { data: alertConfig } = await supabase
      .from("ocio_config")
      .select("module_alerts, alert_whatsapp_number")
      .eq("merchant_id", merchantId)
      .single()

    // Fetch merchant SendApp credentials once before the loop
    const { data: merchantData } = await supabase
      .from("merchants")
      .select("sendapp_instance_id, sendapp_access_token, sendapp_status")
      .eq("id", merchantId)
      .single()

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const review of typedReviews) {
      try {
        const result = await analyzeReview(review, config, apiKey)

        const { error: updateError } = await supabase
          .from("ocio_reviews")
          .update({
            ai_sentiment: result.sentiment,
            ai_score: result.score,
            ai_themes: result.themes,
            ai_urgency: result.urgency,
            ai_is_fake: result.is_fake,
            ai_fake_reason: result.fake_reason,
            ai_suggested_reply: result.suggested_reply,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq("id", review.id)

        if (updateError) {
          logger.error("failed to update review", {
            reviewId: review.id,
            error: updateError.message,
          })
          errors++
        } else {
          processed++

          // Alert WhatsApp — separato, non fa fallire il task
          try {
            const shouldAlert =
              result.sentiment === "negative" ||
              result.urgency === "high" ||
              result.urgency === "critical"

            if (
              shouldAlert &&
              !review.alert_sent &&
              alertConfig?.module_alerts &&
              alertConfig?.alert_whatsapp_number &&
              merchantData?.sendapp_status === "connected" &&
              merchantData?.sendapp_instance_id &&
              merchantData?.sendapp_access_token
            ) {
              const reviewText = review.text ?? ""
              const excerpt =
                reviewText.length > 100 ? reviewText.slice(0, 100) + "..." : reviewText
              const authorName = review.author_name ?? "Anonimo"
              const rating = review.rating ?? "?"
              const appUrl =
                process.env.NEXT_PUBLIC_APP_URL ?? "https://fidelityapp-six.vercel.app"

              const message = `⭐ Nuova recensione ${rating}/5 da ${authorName}\n"${excerpt}"\n\nVisualizza su OCIO: ${appUrl}/dashboard/ocio`

              const normalizedPhone = formatPhoneIT(alertConfig.alert_whatsapp_number)
              if (normalizedPhone) {
                await sendTextMessage(
                  normalizedPhone,
                  message,
                  merchantData.sendapp_instance_id,
                  merchantData.sendapp_access_token
                )

                await supabase
                  .from("ocio_reviews")
                  .update({ alert_sent: true, alert_sent_at: new Date().toISOString() })
                  .eq("id", review.id)
              }
            }
          } catch (alertErr) {
            logger.error("WhatsApp alert failed (non-critical)", {
              reviewId: review.id,
              error: alertErr instanceof Error ? alertErr.message : String(alertErr),
            })
          }
        }
      } catch (err) {
        if (err instanceof SyntaxError) {
          // JSON parse error — skip this review, do not throw
          logger.error("failed to parse AI response for review", {
            reviewId: review.id,
            error: err.message,
          })
          errors++
        } else {
          // System error (network, API key, DB) — propagate for Trigger.dev retry
          throw err
        }
      }
    }

    const summary = { merchantId, processed, skipped, errors }
    logger.log("ocio-ai-analyzer complete", summary)
    return summary
  },
})
