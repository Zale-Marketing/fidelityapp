'use client'
import { useState } from 'react'

export default function LeadForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-2xl font-bold text-gray-900 mb-2">Grazie!</div>
        <p className="text-gray-600">Ti contatteremo entro 24 ore.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Nome *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Mario Rossi"
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="mario@example.com"
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Telefono *</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="+39 333 1234567"
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Messaggio</label>
        <textarea
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Descrivi la tua attivita..."
          rows={3}
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>
      {status === 'error' && (
        <p className="text-red-600 text-sm">Errore durante l&apos;invio. Riprova.</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? 'Invio...' : 'Richiedi Informazioni'}
      </button>
    </form>
  )
}
