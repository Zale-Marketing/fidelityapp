import { logger, schedules } from "@trigger.dev/sdk/v3"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ApifyClient } from "apify-client"

// Apify item shape (defensive — fields may vary by actor version)
interface ApifyReviewItem {
  reviewerId?: string
  publishedAtDate?: string
  publishAt?: string
  name?: string
  reviewerUrl?: string
  stars?: number
  rating?: number
  text?: string
  textTranslated?: string
  responseFromOwnerText?: string
  responseFromOwnerDate?: string
  reviewUrl?: string
  placeId?: string
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scrapeForMerchant(
  merchantId: string,
  googleMapsUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>
): Promise<void> {
  // Count existing reviews to decide maxReviews
  const { count } = await supabase
    .from("ocio_reviews")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)

  const maxReviews = (count ?? 0) === 0 ? 50 : 20

  // Call Apify actor
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN })

  const run = await client
    .actor("compass/google-maps-reviews-scraper")
    .call(
      {
        startUrls: [{ url: googleMapsUrl }],
        reviewsSort: "newest",
        maxReviews,
      },
      { waitSecs: 120 }
    )

  if (run.status !== "SUCCEEDED") {
    throw new Error(`Apify run failed: ${run.status}`)
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  if (!items || items.length === 0) {
    logger.log("no reviews found", { merchantId })
    return
  }

  const typedItems = items as ApifyReviewItem[]

  // Map Apify items to ocio_reviews rows
  const reviews = typedItems
    .map((item) => {
      const reviewId = `${item.reviewerId ?? "anon"}_${item.publishedAtDate ?? item.publishAt ?? "nodate"}`
      if (!reviewId || reviewId === "anon_nodate") return null

      return {
        merchant_id: merchantId,
        review_id: reviewId,
        author_name: item.name ?? null,
        author_url: item.reviewerUrl ?? null,
        rating: item.stars ?? item.rating ?? null,
        text: item.text ?? item.textTranslated ?? null,
        published_at: item.publishedAtDate ?? item.publishAt ?? null,
        owner_reply: item.responseFromOwnerText ?? null,
        owner_reply_at: item.responseFromOwnerDate ?? null,
        review_url: item.reviewUrl ?? null,
        place_id: item.placeId ?? null,
        // AI fields — populated by Phase 15
        ai_sentiment: null,
        ai_score: null,
        ai_themes: null,
        ai_urgency: null,
        ai_category: null,
        ai_summary: null,
        ai_is_fake: false,
        ai_fake_reason: null,
        ai_suggested_reply: null,
        ai_analyzed_at: null,
        reply_status: "pending" as const,
        alert_sent: false,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (reviews.length > 0) {
    await supabase
      .from("ocio_reviews")
      .upsert(reviews, { onConflict: "merchant_id,review_id", ignoreDuplicates: true })
  }

  // Update last_scrape_at
  await supabase
    .from("ocio_config")
    .update({ last_scrape_at: new Date().toISOString() })
    .eq("merchant_id", merchantId)

  logger.log("merchant scraped", {
    merchantId,
    fetched: items.length,
    upserted: reviews.length,
  })
}

export const ocioReviewScraper = schedules.task({
  id: "ocio-review-scraper",
  // Every 6 hours — placeholder cron; actual schedules are created dynamically via API
  cron: "0 */6 * * *",
  maxDuration: 300,
  run: async (_payload) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient<any, "public", any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch all merchants with module_reviews enabled and google_maps_url set
    const { data: configs, error } = await supabase
      .from("ocio_config")
      .select("merchant_id, google_maps_url")
      .eq("module_reviews", true)
      .not("google_maps_url", "is", null)

    if (error) {
      logger.error("Failed to fetch ocio_config", { error: error.message })
      throw error
    }

    if (!configs || configs.length === 0) {
      logger.log("ocio-scraper: no merchants to scrape")
      return
    }

    let successCount = 0
    let failCount = 0

    for (const config of configs) {
      const { merchant_id: merchantId, google_maps_url: googleMapsUrl } = config as {
        merchant_id: string
        google_maps_url: string
      }

      if (!merchantId || !googleMapsUrl) continue

      try {
        await scrapeForMerchant(merchantId, googleMapsUrl, supabase)
        successCount++
      } catch (err) {
        failCount++
        logger.error("merchant scrape failed", {
          merchantId,
          error: err instanceof Error ? err.message : String(err),
        })
        // Continue with next merchant — do not abort the entire run
      }
    }

    logger.log("ocio-scraper complete", {
      totalMerchants: configs.length,
      success: successCount,
      failed: failCount,
    })
  },
})
