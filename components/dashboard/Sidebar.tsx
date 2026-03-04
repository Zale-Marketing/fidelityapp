'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Home, Target, Users, Layers, Bell, BarChart2, CreditCard, Settings, ScanLine, MessageCircle, Bot } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/programs', icon: Target, label: 'Programmi' },
  { href: '/dashboard/customers', icon: Users, label: 'Clienti' },
  { href: '/dashboard/cards', icon: Layers, label: 'Carte' },
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifiche' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Abbonamento' },
  { href: '/dashboard/settings', icon: Settings, label: 'Impostazioni' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const [waConnected, setWaConnected] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    async function loadMerchantStatus() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()
      if (!profile?.merchant_id) return

      const { data: merchant } = await supabase
        .from('merchants')
        .select('plan, sendapp_status')
        .eq('id', profile.merchant_id)
        .single()

      if (merchant) {
        const plan = (merchant.plan as string)?.toLowerCase() ?? 'free'
        setIsPro(plan === 'pro' || plan === 'business')
        setWaConnected(merchant.sendapp_status === 'connected')
      }
    }
    loadMerchantStatus()
  }, [])

  const showWaExtras = isPro && waConnected

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#111111] flex flex-col z-40">
      <div className="px-6 py-5 border-b border-white/10">
        <p className="text-white font-semibold text-lg">FidelityApp</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#2A2A2A] text-white'
                  : 'text-white/70 hover:bg-[#1E1E1E] hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}

        {showWaExtras && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-white/30 text-xs font-medium uppercase tracking-wide">WhatsApp</p>
            </div>
            {[
              { href: '/dashboard/settings/whatsapp-automations', icon: MessageCircle, label: 'Automazioni WA' },
              { href: '/dashboard/settings/whatsapp-ai', icon: Bot, label: 'Chatbot AI' },
            ].map(({ href, icon: Icon, label }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#2A2A2A] text-white'
                      : 'text-white/70 hover:bg-[#1E1E1E] hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <Link
          href="/stamp"
          className="flex items-center gap-3 px-3 py-2.5 bg-white text-[#111111] rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <ScanLine size={18} />
          Apri Scanner
        </Link>
      </div>
    </aside>
  )
}
