'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import EmptyState from '@/components/ui/EmptyState'
import MetricCard from '@/components/ui/MetricCard'
import type { OcioReview } from '@/lib/types'
import {
  Eye, Settings, Star, AlertTriangle, Clock, CheckCircle, XCircle, Copy, ExternalLink
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import Link from 'next/link'

// ---- Review Card sub-component ----

function sentimentLabel(s: OcioReview['ai_sentiment']): string {
  if (s === 'positive') return 'Positiva'
  if (s === 'neutral') return 'Neutra'
  if (s === 'negative') return 'Negativa'
  return '—'
}

function sentimentColor(s: OcioReview['ai_sentiment']): string {
  if (s === 'positive') return 'bg-green-100 text-green-700'
  if (s === 'neutral') return 'bg-yellow-100 text-yellow-700'
  if (s === 'negative') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-500'
}

function urgencyLabel(u: OcioReview['ai_urgency']): string {
  if (u === 'low') return 'Bassa'
  if (u === 'medium') return 'Media'
  if (u === 'high') return 'Alta'
  if (u === 'critical') return 'Critica'
  return '—'
}

function urgencyColor(u: OcioReview['ai_urgency']): string {
  if (u === 'low') return 'bg-gray-100 text-gray-500'
  if (u === 'medium') return 'bg-yellow-100 text-yellow-700'
  if (u === 'high') return 'bg-orange-100 text-orange-700'
  if (u === 'critical') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-400'
}

function StarRow({ rating, size = 14 }: { rating: number | null; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array(5).fill(0).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < (rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </span>
  )
}

function ReviewCard({ review, onClick }: { review: OcioReview; onClick: () => void }) {
  const date = review.published_at
    ? new Date(review.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const themes = review.ai_themes ?? []
  const visibleThemes = themes.slice(0, 2)
  const extraThemes = themes.length - 2

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <StarRow rating={review.rating} />
            <span className="text-sm font-medium text-gray-900">{review.author_name ?? 'Anonimo'}</span>
            <span className="text-xs text-gray-400">{date}</span>
            {/* Reply status badge */}
            {review.reply_status === 'replied' && (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                <CheckCircle size={11} />
                Risposto
              </span>
            )}
            {review.reply_status === 'ignored' && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                <XCircle size={11} />
                Ignorato
              </span>
            )}
          </div>

          {/* Review text */}
          {review.text ? (
            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{review.text}</p>
          ) : (
            <p className="text-sm text-gray-400 italic mb-2">Nessun testo disponibile</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {review.ai_sentiment && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentimentColor(review.ai_sentiment)}`}>
                {sentimentLabel(review.ai_sentiment)}
              </span>
            )}
            {review.ai_urgency && review.ai_urgency !== 'low' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor(review.ai_urgency)}`}>
                {urgencyLabel(review.ai_urgency)}
              </span>
            )}
            {visibleThemes.map(theme => (
              <span key={theme} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {theme}
              </span>
            ))}
            {extraThemes > 0 && (
              <span className="text-xs text-gray-400">+{extraThemes} altri</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClick}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 border border-[#E0E0E0] rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Vedi risposta AI
        </button>
      </div>
    </div>
  )
}

// ---- Filter pill button ----
function Pill({
  active, onClick, children
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-black text-white'
          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

// ---- Paginated reviews fetch ----

async function fetchAllReviews(supabase: ReturnType<typeof createClient>, merchantId: string): Promise<OcioReview[]> {
  const pageSize = 1000
  let from = 0
  let allReviews: OcioReview[] = []
  while (true) {
    const { data, error } = await supabase
      .from('ocio_reviews')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('published_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error || !data || data.length === 0) break
    allReviews = [...allReviews, ...data]
    if (data.length < pageSize) break
    from += pageSize
  }
  return allReviews
}

// ---- Main page ----

export default function OcioDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isBusiness, loading: planLoading } = usePlan()

  const [reviews, setReviews] = useState<OcioReview[]>([])
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<OcioReview | null>(null)
  const [globalPeriod, setGlobalPeriod] = useState<'30' | '90' | '180' | '365' | 'all'>('all')
  const [themeFilter, setThemeFilter] = useState<{ theme: string; sentiment: 'positive' | 'negative' } | null>(null)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [periodAFrom, setPeriodAFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [periodATo, setPeriodATo] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [periodBFrom, setPeriodBFrom] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [periodBTo, setPeriodBTo] = useState<string>(() => {
    const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0]
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all')
  const [filterRating, setFilterRating] = useState<number | 'all'>('all')
  const [copying, setCopying] = useState(false)
  const [accessToken, setAccessToken] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (reviews.length === 0 && googleMapsUrl !== null && !loading) {
      const interval = setInterval(() => {
        loadData()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [reviews.length, googleMapsUrl, loading])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) setAccessToken(session.access_token)

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) { router.push('/register'); return }

    const merchantId = profile.merchant_id

    const [reviewsData, { data: configData }] = await Promise.all([
      fetchAllReviews(supabase, merchantId),
      supabase
        .from('ocio_config')
        .select('google_maps_url')
        .eq('merchant_id', merchantId)
        .single(),
    ])

    setReviews(reviewsData)
    setGoogleMapsUrl(configData?.google_maps_url ?? null)
    setLoading(false)
  }

  // ---- KPI computation ----
  const kpis = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const withRating = reviews.filter(r => r.rating !== null)
    const avgRating = withRating.length > 0
      ? (withRating.reduce((sum, r) => sum + (r.rating ?? 0), 0) / withRating.length).toFixed(1)
      : '—'

    const last30 = withRating.filter(r => r.published_at && new Date(r.published_at) >= thirtyDaysAgo)
    const prev30 = withRating.filter(r => {
      if (!r.published_at) return false
      const d = new Date(r.published_at)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    })
    const avgLast30 = last30.length > 0 ? last30.reduce((sum, r) => sum + (r.rating ?? 0), 0) / last30.length : null
    const avgPrev30 = prev30.length > 0 ? prev30.reduce((sum, r) => sum + (r.rating ?? 0), 0) / prev30.length : null
    const ratingTrend = avgLast30 !== null && avgPrev30 !== null
      ? (avgLast30 - avgPrev30 >= 0
        ? `▲ +${(avgLast30 - avgPrev30).toFixed(1)} vs mese scorso`
        : `▼ ${(avgLast30 - avgPrev30).toFixed(1)} vs mese scorso`)
      : undefined

    const newLast30 = reviews.filter(r => r.published_at && new Date(r.published_at) >= thirtyDaysAgo).length
    const pending = reviews.filter(r => r.reply_status === 'pending').length

    return { avgRating, total: reviews.length, newLast30, pending, ratingTrend }
  }, [reviews])

  // ---- Intelligence data ----
  const intelligenceData = useMemo(() => {
    // Apply globalPeriod
    const now = new Date()
    const periodReviews = globalPeriod === 'all' ? reviews : reviews.filter(r => {
      if (!r.published_at) return false
      const days = parseInt(globalPeriod)
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      return new Date(r.published_at) >= cutoff
    })
    const totalInPeriod = periodReviews.length

    // Adaptive thresholds
    const isLowData = totalInPeriod < 20
    const negRatioThreshold = isLowData ? 0.2 : 0.3
    const negMinCount = isLowData ? 2 : 3
    const posRatioThreshold = isLowData ? 0.3 : 0.2
    const posMinCount = isLowData ? 3 : 5

    // Calculate stats per theme
    const themeStats: Record<string, { total: number; positive: number; negative: number }> = {}
    for (const r of periodReviews) {
      if (!r.ai_themes) continue
      for (const t of r.ai_themes) {
        if (!themeStats[t]) themeStats[t] = { total: 0, positive: 0, negative: 0 }
        themeStats[t].total++
        if (r.ai_sentiment === 'positive') themeStats[t].positive++
        if (r.ai_sentiment === 'negative') themeStats[t].negative++
      }
    }

    // Widget 1: Areas to improve (high negative ratio)
    const improvementAreas = Object.entries(themeStats)
      .filter(([, s]) => s.total >= negMinCount && (s.negative / s.total) > negRatioThreshold)
      .sort((a, b) => (b[1].negative / b[1].total) - (a[1].negative / a[1].total))
      .slice(0, 5)
      .map(([theme, s]) => ({ theme, ...s, ratio: s.negative / s.total }))

    // Widget 2: Strengths (high positive ratio)
    const strengths = Object.entries(themeStats)
      .filter(([, s]) => s.total >= posMinCount && (s.negative / s.total) < posRatioThreshold)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([theme, s]) => ({ theme, ...s, ratio: s.negative / s.total }))

    // Widget 3: Urgent without reply (filtered by globalPeriod)
    const urgentPending = periodReviews.filter(
      r => r.reply_status === 'pending' && (r.ai_urgency === 'high' || r.ai_urgency === 'critical')
    )

    const hasAnalyzedThemes = periodReviews.some(r => r.ai_themes && r.ai_themes.length > 0)

    return { improvementAreas, strengths, urgentPending, hasAnalyzedThemes, totalInPeriod }
  }, [reviews, globalPeriod])

  // ---- Chart data (dynamic: monthly or quarterly) ----
  const chartData = useMemo(() => {
    if (reviews.length === 0) return []

    const dates = reviews
      .filter(r => r.published_at)
      .map(r => new Date(r.published_at!).getTime())
    if (dates.length === 0) return []

    const minDate = new Date(Math.min(...dates))
    const now = new Date()
    const spanMonths =
      (now.getFullYear() - minDate.getFullYear()) * 12 + (now.getMonth() - minDate.getMonth())

    if (spanMonths > 36) {
      // Group by quarter — last 12 quarters
      const quarters: { label: string; avgRating: number | null; count: number; sentimentScore: number | null }[] = []
      for (let i = 11; i >= 0; i--) {
        const now2 = new Date()
        const totalMonthsBack = i * 3
        const qYear = new Date(now2.getFullYear(), now2.getMonth() - totalMonthsBack, 1)
        const qStart = new Date(qYear.getFullYear(), Math.floor(qYear.getMonth() / 3) * 3, 1)
        const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 1)
        const label = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear().toString().slice(2)}`
        const qReviews = reviews.filter(r => {
          if (!r.published_at) return false
          const d = new Date(r.published_at)
          return d >= qStart && d < qEnd
        })
        const withR = qReviews.filter(r => r.rating !== null)
        const avg = withR.length > 0 ? parseFloat((withR.reduce((s, r) => s + (r.rating ?? 0), 0) / withR.length).toFixed(1)) : null
        const withScore = qReviews.filter(r => r.ai_score !== null)
        const sentimentScore = withScore.length > 0 ? parseFloat((withScore.reduce((s, r) => s + (r.ai_score ?? 0), 0) / withScore.length).toFixed(1)) : null
        quarters.push({ label, avgRating: avg, count: qReviews.length, sentimentScore })
      }
      return quarters
    } else {
      // Group by month — last 12 months
      const months: { label: string; avgRating: number | null; count: number; sentimentScore: number | null }[] = []
      const numMonths = Math.min(Math.max(spanMonths + 1, 6), 12)
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
        const monthReviews = reviews.filter(r => {
          if (!r.published_at) return false
          const rd = new Date(r.published_at)
          return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth()
        })
        const withR = monthReviews.filter(r => r.rating !== null)
        const avg = withR.length > 0 ? parseFloat((withR.reduce((s, r) => s + (r.rating ?? 0), 0) / withR.length).toFixed(1)) : null
        const withScore = monthReviews.filter(r => r.ai_score !== null)
        const sentimentScore = withScore.length > 0 ? parseFloat((withScore.reduce((s, r) => s + (r.ai_score ?? 0), 0) / withScore.length).toFixed(1)) : null
        months.push({ label, avgRating: avg, count: monthReviews.length, sentimentScore })
      }
      return months
    }
  }, [reviews])

  // ---- Filtered reviews ----
  const filteredReviews = useMemo(() => {
    const now = new Date()
    return reviews.filter(r => {
      // globalPeriod first
      if (globalPeriod !== 'all' && r.published_at) {
        const days = parseInt(globalPeriod)
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        if (new Date(r.published_at) < cutoff) return false
      }
      // searchQuery
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (
          !(r.text?.toLowerCase().includes(q)) &&
          !(r.author_name?.toLowerCase().includes(q))
        ) return false
      }
      // themeFilter
      if (themeFilter) {
        if (!r.ai_themes?.includes(themeFilter.theme)) return false
        if (r.ai_sentiment !== themeFilter.sentiment) return false
      }
      if (filterSentiment !== 'all' && r.ai_sentiment !== filterSentiment) return false
      if (filterRating !== 'all' && r.rating !== filterRating) return false
      return true
    })
  }, [reviews, globalPeriod, searchQuery, themeFilter, filterSentiment, filterRating])

  // ---- Comparison data ----
  const comparisonData = useMemo(() => {
    if (!comparisonOpen) return null
    const filterPeriodRange = (from: string, to: string) =>
      reviews.filter(r => {
        if (!r.published_at) return false
        const d = r.published_at.split('T')[0]
        return d >= from && d <= to
      })
    const a = filterPeriodRange(periodAFrom, periodATo)
    const b = filterPeriodRange(periodBFrom, periodBTo)
    if (a.length === 0 && b.length === 0) return null

    const pct = (arr: OcioReview[], sentiment: string) =>
      arr.length > 0 ? Math.round(arr.filter(r => r.ai_sentiment === sentiment).length / arr.length * 100) : null
    const avgField = (arr: OcioReview[], field: 'rating' | 'ai_score') => {
      const valid = arr.filter(r => r[field] !== null)
      return valid.length > 0 ? parseFloat((valid.reduce((s, r) => s + (r[field] as number), 0) / valid.length).toFixed(1)) : null
    }
    const topNeg = (arr: OcioReview[]) => {
      const cnt: Record<string, number> = {}
      for (const r of arr) if (r.ai_sentiment === 'negative' && r.ai_themes) for (const t of r.ai_themes) cnt[t] = (cnt[t] ?? 0) + 1
      return Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([t]) => t)
    }
    return {
      posA: pct(a, 'positive'), posB: pct(b, 'positive'),
      negA: pct(a, 'negative'), negB: pct(b, 'negative'),
      ratingA: avgField(a, 'rating'), ratingB: avgField(b, 'rating'),
      scoreA: avgField(a, 'ai_score'), scoreB: avgField(b, 'ai_score'),
      topNegA: topNeg(a), topNegB: topNeg(b),
      countA: a.length, countB: b.length,
    }
  }, [reviews, comparisonOpen, periodAFrom, periodATo, periodBFrom, periodBTo])

  // ---- Modal actions ----
  async function updateReplyStatus(reviewId: string, status: 'replied' | 'ignored') {
    try {
      await fetch(`/api/ocio/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reply_status: status }),
      })
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, reply_status: status, ...(status === 'replied' ? { replied_at: new Date().toISOString() } : {}) }
          : r
      ))
      setSelectedReview(null)
    } catch (err) {
      console.error('Failed to update reply status', err)
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopying(true)
      setTimeout(() => setCopying(false), 2000)
    } catch {
      // fallback silenzioso
    }
  }

  // ---- Render ----

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isBusiness) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <UpgradePrompt feature="Dashboard OCIO — Reputation Intelligence" requiredPlan="BUSINESS" />
      </div>
    )
  }

  if (reviews.length === 0 && googleMapsUrl !== null) {
    return (
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Eye size={24} />
              OCIO — Reputation Intelligence
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gestisci le tue recensioni Google con l&apos;aiuto dell&apos;AI</p>
          </div>
          <Link
            href="/dashboard/ocio/settings"
            className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings size={16} />
            Impostazioni
          </Link>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-10 h-10 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <h2 className="text-lg font-semibold text-gray-900">Stiamo analizzando la tua attività…</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Le tue recensioni sono in fase di raccolta e analisi AI. Questa pagina si aggiornerà automaticamente ogni 30 secondi.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye size={24} />
            OCIO — Reputation Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gestisci le tue recensioni Google con l&apos;aiuto dell&apos;AI</p>
        </div>
        <Link
          href="/dashboard/ocio/settings"
          className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings size={16} />
          Impostazioni
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Rating medio"
          value={kpis.avgRating}
          icon={<Star size={20} />}
          trend={kpis.ratingTrend}
        />
        <MetricCard
          label="Recensioni totali"
          value={kpis.total}
          icon={<Eye size={20} />}
        />
        <MetricCard
          label="Nuove (30gg)"
          value={kpis.newLast30}
          icon={<Clock size={20} />}
        />
        <MetricCard
          label="Da rispondere"
          value={kpis.pending}
          icon={<AlertTriangle size={20} />}
        />
      </div>

      {/* Global period filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">Periodo:</span>
        <Pill active={globalPeriod === '30'} onClick={() => setGlobalPeriod('30')}>Ultimi 30gg</Pill>
        <Pill active={globalPeriod === '90'} onClick={() => setGlobalPeriod('90')}>Ultimi 3 mesi</Pill>
        <Pill active={globalPeriod === '180'} onClick={() => setGlobalPeriod('180')}>Ultimi 6 mesi</Pill>
        <Pill active={globalPeriod === '365'} onClick={() => setGlobalPeriod('365')}>Ultimi 12 mesi</Pill>
        <Pill active={globalPeriod === 'all'} onClick={() => setGlobalPeriod('all')}>Tutto</Pill>
      </div>

      {/* Intelligence Panel */}
      {reviews.some(r => r.ai_sentiment || r.ai_themes) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Widget 1: Aree da migliorare */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aree da migliorare</p>
            {!intelligenceData.hasAnalyzedThemes ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                ))}
              </div>
            ) : intelligenceData.improvementAreas.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessuna area critica nel periodo</p>
            ) : (
              <div className="space-y-3">
                {intelligenceData.improvementAreas.map(({ theme, total, negative, positive, ratio }) => (
                  <button key={theme} onClick={() => setThemeFilter({ theme, sentiment: 'negative' })}
                    className="w-full text-left group">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate group-hover:text-gray-900">{theme}</span>
                      <span className="text-red-500 font-medium ml-2 flex-shrink-0">{Math.round(ratio * 100)}% neg</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-green-400" style={{ width: `${Math.round(positive / total * 100)}%` }} />
                      <div className="bg-red-400" style={{ width: `${Math.round(negative / total * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{total} recensioni</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Widget 2: Punti di forza */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Punti di forza</p>
            {!intelligenceData.hasAnalyzedThemes ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                ))}
              </div>
            ) : intelligenceData.strengths.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nessun punto di forza nel periodo</p>
            ) : (
              <div className="space-y-3">
                {intelligenceData.strengths.map(({ theme, total, negative, positive, ratio }) => (
                  <button key={theme} onClick={() => setThemeFilter({ theme, sentiment: 'positive' })}
                    className="w-full text-left group">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-green-700 truncate group-hover:text-green-900">{theme}</span>
                      <span className="text-green-500 font-medium ml-2 flex-shrink-0">{Math.round((1 - ratio) * 100)}% pos</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-green-400" style={{ width: `${Math.round(positive / total * 100)}%` }} />
                      <div className="bg-red-400" style={{ width: `${Math.round(negative / total * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{total} recensioni</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Widget 3: Urgenti senza risposta */}
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Urgenti senza risposta</p>
            <div className="flex flex-col items-center mb-3">
              <span className={`text-4xl font-bold ${intelligenceData.urgentPending.length > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {intelligenceData.urgentPending.length}
              </span>
              <span className="text-xs text-gray-500 text-center mt-1">recensioni urgenti senza risposta</span>
            </div>
            <div className="space-y-2">
              {intelligenceData.urgentPending.slice(0, 2).map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReview(r)}
                  className="w-full text-left p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <StarRow rating={r.rating} size={11} />
                    <span className="text-xs font-medium text-gray-700 truncate">{r.author_name ?? 'Anonimo'}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{r.text?.slice(0, 60) ?? '—'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period comparison */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl overflow-hidden">
        <button
          onClick={() => setComparisonOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>Confronta due periodi</span>
          <span className={`transition-transform ${comparisonOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {comparisonOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-[#E8E8E8]">
            {/* Date pickers side by side */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Periodo A</p>
                <div className="flex gap-2 items-center">
                  <input type="date" value={periodAFrom} onChange={e => setPeriodAFrom(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                  <span className="text-xs text-gray-400">→</span>
                  <input type="date" value={periodATo} onChange={e => setPeriodATo(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Periodo B</p>
                <div className="flex gap-2 items-center">
                  <input type="date" value={periodBFrom} onChange={e => setPeriodBFrom(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                  <span className="text-xs text-gray-400">→</span>
                  <input type="date" value={periodBTo} onChange={e => setPeriodBTo(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
                </div>
              </div>
            </div>
            {/* Comparison table */}
            {comparisonData ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-2 font-medium">Metrica</th>
                    <th className="text-center py-2 font-medium">Periodo A ({comparisonData.countA} rec.)</th>
                    <th className="text-center py-2 font-medium">Periodo B ({comparisonData.countB} rec.)</th>
                    <th className="text-center py-2 font-medium">Variazione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: '% Positive', a: comparisonData.posA, b: comparisonData.posB, unit: '%', higherIsBetter: true },
                    { label: '% Negative', a: comparisonData.negA, b: comparisonData.negB, unit: '%', higherIsBetter: false },
                    { label: 'Rating medio', a: comparisonData.ratingA, b: comparisonData.ratingB, unit: '', higherIsBetter: true },
                    { label: 'Score AI medio', a: comparisonData.scoreA, b: comparisonData.scoreB, unit: '', higherIsBetter: true },
                  ].map(({ label, a, b, unit, higherIsBetter }) => {
                    const diff = a !== null && b !== null ? parseFloat((a - b).toFixed(1)) : null
                    const isPositive = diff !== null && (higherIsBetter ? diff > 0 : diff < 0)
                    return (
                      <tr key={label}>
                        <td className="py-2 text-gray-600">{label}</td>
                        <td className="py-2 text-center font-medium">{a !== null ? `${a}${unit}` : '—'}</td>
                        <td className="py-2 text-center font-medium">{b !== null ? `${b}${unit}` : '—'}</td>
                        <td className={`py-2 text-center font-semibold ${diff !== null ? (isPositive ? 'text-green-600' : diff === 0 ? 'text-gray-400' : 'text-red-600') : 'text-gray-300'}`}>
                          {diff !== null ? `${diff > 0 ? '+' : ''}${diff}${unit}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td className="py-2 text-gray-600">Top temi negativi</td>
                    <td className="py-2 text-center text-xs text-gray-500">{comparisonData.topNegA.join(', ') || '—'}</td>
                    <td className="py-2 text-center text-xs text-gray-500">{comparisonData.topNegB.join(', ') || '—'}</td>
                    <td className="py-2" />
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-4">Nessuna recensione nei periodi selezionati</p>
            )}
          </div>
        )}
      </div>

      {/* Chart trend */}
      {chartData.some(d => d.count > 0) && (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Trend recensioni</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                domain={[1, 5]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Rating', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Num.', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="right" dataKey="count" name="Recensioni" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgRating"
                name="Rating medio"
                stroke="#111111"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sentimentScore"
                name="Score AI"
                stroke="#6366F1"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cerca per testo o autore…"
          className="w-full text-sm border border-[#E8E8E8] rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-gray-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      {searchQuery.trim() && (
        <p className="text-xs text-gray-500 -mt-2">
          {filteredReviews.length} risultat{filteredReviews.length === 1 ? 'o' : 'i'} trovat{filteredReviews.length === 1 ? 'o' : 'i'} per &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium w-16">Sentiment</span>
          <Pill active={filterSentiment === 'all'} onClick={() => setFilterSentiment('all')}>Tutti</Pill>
          <Pill active={filterSentiment === 'positive'} onClick={() => setFilterSentiment('positive')}>Positivo</Pill>
          <Pill active={filterSentiment === 'neutral'} onClick={() => setFilterSentiment('neutral')}>Neutro</Pill>
          <Pill active={filterSentiment === 'negative'} onClick={() => setFilterSentiment('negative')}>Negativo</Pill>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium w-16">Rating</span>
          <Pill active={filterRating === 'all'} onClick={() => setFilterRating('all')}>Tutti</Pill>
          {[1, 2, 3, 4, 5].map(n => (
            <Pill key={n} active={filterRating === n} onClick={() => setFilterRating(n)}>
              {'★'.repeat(n)} {n}
            </Pill>
          ))}
        </div>
      </div>

      {/* Theme drill-down banner */}
      {themeFilter && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-sm text-indigo-700">
            Stai vedendo: recensioni{' '}
            <span className="font-semibold">{themeFilter.sentiment === 'negative' ? 'negative' : 'positive'}</span>
            {' '}su{' '}
            <span className="font-semibold">&ldquo;{themeFilter.theme}&rdquo;</span>
          </p>
          <button
            onClick={() => setThemeFilter(null)}
            className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-700 font-medium ml-4 flex-shrink-0"
          >
            Mostra tutte ✕
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <EmptyState
            icon={Eye}
            title="Nessuna recensione ancora"
            description="Configura l'URL Google Maps nelle impostazioni OCIO e attendi il primo scraping automatico."
            actionLabel="Configura impostazioni"
            actionHref="/dashboard/ocio/settings"
          />
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">Nessuna recensione corrisponde ai filtri selezionati.</p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onClick={() => setSelectedReview(review)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRow rating={selectedReview.rating} size={16} />
                  <span className="font-semibold text-gray-900">{selectedReview.author_name ?? 'Anonimo'}</span>
                </div>
                {selectedReview.published_at && (
                  <p className="text-sm text-gray-400">
                    {new Date(selectedReview.published_at).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Full review text */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Testo recensione</h3>
              {selectedReview.text ? (
                <p className="text-sm text-gray-700 leading-relaxed">{selectedReview.text}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Nessun testo disponibile</p>
              )}
            </div>

            {/* Fake review banner */}
            {selectedReview.ai_is_fake && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Possibile recensione falsa rilevata</p>
                  {selectedReview.ai_fake_reason && (
                    <p className="text-sm text-amber-700 mt-1">{selectedReview.ai_fake_reason}</p>
                  )}
                </div>
              </div>
            )}

            {/* AI analysis */}
            {(selectedReview.ai_sentiment || selectedReview.ai_urgency || (selectedReview.ai_themes && selectedReview.ai_themes.length > 0) || selectedReview.ai_score !== null) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Analisi AI</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedReview.ai_sentiment && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sentimentColor(selectedReview.ai_sentiment)}`}>
                      {sentimentLabel(selectedReview.ai_sentiment)}
                    </span>
                  )}
                  {selectedReview.ai_urgency && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urgencyColor(selectedReview.ai_urgency)}`}>
                      Urgenza: {urgencyLabel(selectedReview.ai_urgency)}
                    </span>
                  )}
                  {selectedReview.ai_score !== null && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      Score: {selectedReview.ai_score}/10
                    </span>
                  )}
                  {(selectedReview.ai_themes ?? []).map(theme => (
                    <span key={theme} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI suggested reply */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risposta suggerita dall&apos;AI</h3>
              {selectedReview.ai_suggested_reply ? (
                <>
                  <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedReview.ai_suggested_reply}
                  </pre>
                  <button
                    onClick={() => handleCopy(selectedReview.ai_suggested_reply!)}
                    className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copying
                        ? 'bg-green-600 text-white'
                        : 'bg-[#111111] text-white hover:bg-[#333333]'
                    }`}
                  >
                    <Copy size={14} />
                    {copying ? 'Copiato!' : 'Copia risposta'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Analisi AI non ancora disponibile</p>
              )}
            </div>

            {/* Google Maps link */}
            {(selectedReview.review_url ?? googleMapsUrl) && (
              <a
                href={selectedReview.review_url ?? googleMapsUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ExternalLink size={14} />
                Apri su Google Maps
              </a>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => updateReplyStatus(selectedReview.id, 'replied')}
                  disabled={selectedReview.reply_status === 'replied'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedReview.reply_status === 'replied'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <CheckCircle size={14} />
                  {selectedReview.reply_status === 'replied' ? 'Gia risposto' : 'Ho risposto'}
                </button>
                <button
                  onClick={() => updateReplyStatus(selectedReview.id, 'ignored')}
                  disabled={selectedReview.reply_status === 'ignored'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedReview.reply_status === 'ignored'
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <XCircle size={14} />
                  {selectedReview.reply_status === 'ignored' ? 'Ignorato' : 'Ignora'}
                </button>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
