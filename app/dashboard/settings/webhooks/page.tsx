'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { Zap, Trash2, Plus, Copy, CheckCircle2 } from 'lucide-react'

const AVAILABLE_EVENTS = [
  { id: 'bollino_aggiunto', label: 'Bollino aggiunto' },
  { id: 'card_creata', label: 'Carta creata' },
  { id: 'premio_riscattato', label: 'Premio riscattato' },
  { id: 'nuovo_cliente', label: 'Nuovo cliente' },
]

type Endpoint = {
  id: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

function SecretAlert({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6 border border-yellow-300 bg-yellow-50 rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-sm font-semibold text-yellow-800">Secret generato — salvalo subito!</p>
        <button
          onClick={onClose}
          className="text-yellow-600 hover:text-yellow-800 text-lg leading-none flex-shrink-0"
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-yellow-700 mb-3">
        Salva questo secret — non sara mostrato di nuovo
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-yellow-100 border border-yellow-200 rounded-[6px] px-3 py-2 text-xs font-mono text-yellow-900 break-all">
          {secret}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-700 text-white px-3 py-2 rounded-[6px] text-xs font-semibold hover:bg-yellow-800"
        >
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>
    </div>
  )
}

export default function WebhooksSettingsPage() {
  const supabase = createClient()
  const { isBusiness, loading: planLoading } = usePlan()

  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!planLoading && isBusiness) {
      loadEndpoints()
    } else if (!planLoading) {
      setLoading(false)
    }
  }, [planLoading, isBusiness])

  async function loadEndpoints() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const res = await fetch('/api/webhooks', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEndpoints(data)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  async function handleAddEndpoint(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!newUrl || !selectedEvent) return
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSaving(false); return }

      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: newUrl, events: [selectedEvent] }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore nella creazione')
        setSaving(false)
        return
      }

      // Append to list (without exposing secret in list)
      const { secret: _secret, secret_note: _note, ...endpointWithoutSecret } = data
      setEndpoints(prev => [endpointWithoutSecret, ...prev])
      setNewSecret(data.secret)
      setNewUrl('')
      setSelectedEvent('')
      setShowAddForm(false)
    } catch {
      setError('Errore di rete')
    }

    setSaving(false)
  }

  async function handleToggle(endpoint: Endpoint) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`/api/webhooks/${endpoint.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ is_active: !endpoint.is_active }),
    })

    if (res.ok) {
      const updated = await res.json()
      setEndpoints(prev => prev.map(ep => ep.id === endpoint.id ? { ...ep, is_active: updated.is_active } : ep))
    }
  }

  async function handleDelete(endpointId: string) {
    if (!confirm('Eliminare questo webhook endpoint?')) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`/api/webhooks/${endpointId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.ok) {
      setEndpoints(prev => prev.filter(ep => ep.id !== endpointId))
    }
  }

  if (planLoading || loading) {
    return (
      <div className="px-6 py-6">
        <div className="animate-pulse h-8 bg-gray-100 rounded-[8px] w-48 mb-4" />
        <div className="animate-pulse h-32 bg-gray-100 rounded-[12px]" />
      </div>
    )
  }

  return (
    <div className="px-6 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Webhook Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ricevi eventi FidelityApp nel tuo sistema tramite webhook firmati HMAC-SHA256
        </p>
      </div>

      {!isBusiness ? (
        <UpgradePrompt feature="Webhook Integrations" requiredPlan="BUSINESS" />
      ) : (
        <div className="max-w-2xl">
          {/* One-time secret alert */}
          {newSecret && (
            <SecretAlert secret={newSecret} onClose={() => setNewSecret(null)} />
          )}

          {/* Endpoint list card */}
          <div className="bg-white border border-[#E8E8E8] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E8]">
              <h2 className="text-sm font-semibold text-[#111111]">
                Endpoint configurati
                {endpoints.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({endpoints.length})</span>
                )}
              </h2>
              <button
                onClick={() => { setShowAddForm(v => !v); setError(null) }}
                className="flex items-center gap-1.5 bg-[#111111] text-white px-3 py-2 rounded-[8px] text-xs font-semibold hover:bg-[#333333]"
              >
                <Plus size={14} />
                Aggiungi Endpoint
              </button>
            </div>

            {endpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Zap size={48} color="#D1D5DB" className="mb-4" />
                <p className="text-sm font-semibold text-gray-500 mb-1">Nessun webhook configurato</p>
                <p className="text-xs text-gray-400">
                  Aggiungi un endpoint per ricevere eventi in tempo reale.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F5F5F5]">
                {endpoints.map(endpoint => (
                  <div key={endpoint.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111111] truncate">{endpoint.url}</p>
                        <div className="mt-1.5">
                          {(() => {
                            const ev = endpoint.events[0]
                            const label = AVAILABLE_EVENTS.find(e => e.id === ev)?.label ?? ev
                            return (
                              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                {label}
                              </span>
                            )
                          })()}
                          {endpoint.events.length > 1 && (
                            <span className="ml-1 text-xs text-gray-400">+{endpoint.events.length - 1}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            endpoint.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {endpoint.is_active ? 'Attivo' : 'Inattivo'}
                        </span>
                        <button
                          onClick={() => handleToggle(endpoint)}
                          className="border border-[#E0E0E0] text-gray-700 px-2.5 py-1 rounded-[6px] text-xs hover:bg-[#F5F5F5]"
                        >
                          {endpoint.is_active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button
                          onClick={() => handleDelete(endpoint.id)}
                          className="border border-[#FEE2E2] text-[#DC2626] p-1.5 rounded-[6px] hover:bg-[#FEE2E2]/50"
                          aria-label="Elimina endpoint"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="mt-4 bg-white border border-[#E8E8E8] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
              <h3 className="text-sm font-semibold text-[#111111] mb-4">Nuovo Endpoint</h3>
              <form onSubmit={handleAddEndpoint} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">URL Endpoint</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    required
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-3 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Evento</label>
                  <select
                    value={selectedEvent}
                    onChange={e => setSelectedEvent(e.target.value)}
                    required
                    className="w-full border border-[#E0E0E0] rounded-[8px] px-3 py-3 text-sm focus:border-[#111111] focus:outline-none bg-white"
                  >
                    <option value="">— Seleziona evento —</option>
                    {AVAILABLE_EVENTS.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Un endpoint gestisce un solo tipo di evento.</p>
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-[6px] px-3 py-2">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving || !newUrl || !selectedEvent}
                    className="bg-[#111111] text-white px-4 py-2.5 rounded-[8px] text-sm font-semibold hover:bg-[#333333] disabled:opacity-50"
                  >
                    {saving ? 'Salvataggio...' : 'Aggiungi Endpoint'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setError(null) }}
                    className="border border-[#E0E0E0] text-gray-700 px-4 py-2.5 rounded-[8px] text-sm hover:bg-[#F5F5F5]"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
