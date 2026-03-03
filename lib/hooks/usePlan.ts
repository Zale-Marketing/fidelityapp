'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Plan = 'free' | 'pro' | 'business'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.merchant_id) { setLoading(false); return }

      const { data: merchant } = await supabase
        .from('merchants')
        .select('plan')
        .eq('id', profile.merchant_id)
        .single()

      if (merchant?.plan) {
        setPlan((merchant.plan as string).toLowerCase() as Plan)
      }
      setLoading(false)
    }

    loadPlan()
  }, [])

  return {
    plan,
    loading,
    isFree: plan === 'free',
    isPro: plan === 'pro' || plan === 'business',
    isBusiness: plan === 'business',
  }
}
