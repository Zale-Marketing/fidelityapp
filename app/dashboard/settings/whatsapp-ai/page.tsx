'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlan'
import UpgradePrompt from '@/components/ui/UpgradePrompt'
import { ArrowLeft, Eye, EyeOff, Send, Bot, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Provider = 'openai' | 'anthropic'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function WhatsAppAIPage() {
  const supabase = createClient()
  const router = useRouter()
  const { isFree, loading: planLoading } = usePlan()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [merchantId, setMerchantId] = useState<string | null>(null)

  // Form state
  const [chatbotEnabled, setChatbotEnabled] = useState(false)
  const [provider, setProvider] = useState<Provider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')

  // Test chat
  const [testMessage, setTestMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.merchant_id) { setLoading(false); return }
    setMerchantId(profile.merchant_id)

    const { data: merchant } = await supabase
      .from('merchants')
      .select('ai_chatbot_enabled, ai_provider, ai_api_key, ai_system_prompt')
      .eq('id', profile.merchant_id)
      .single()

    if (merchant) {
      setChatbotEnabled(merchant.ai_chatbot_enabled ?? false)
      setProvider((merchant.ai_provider as Provider) || 'openai')
      setApiKey(merchant.ai_api_key ?? '')
      setSystemPrompt(merchant.ai_system_prompt ?? '')
    }
    setLoading(false)
  }

  async function saveConfig() {
    if (!merchantId) return
    setSaving(true)

    const { error } = await supabase
      .from('merchants')
      .update({
        ai_chatbot_enabled: chatbotEnabled,
        ai_provider: provider,
        ai_api_key: apiKey || null,
        ai_system_prompt: systemPrompt || null,
      })
      .eq('id', merchantId)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function runTest() {
    if (!testMessage.trim()) return
    setTestLoading(true)
    setTestError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setTestError('Non autenticato'); setTestLoading(false); return }

    const userMsg = testMessage.trim()
    setTestMessage('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      const res = await fetch('/api/whatsapp/ai-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore')
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err: any) {
      setTestError(err.message)
      setChatMessages(prev => prev.slice(0, -1)) // rimuovi messaggio utente se fallisce
    }

    setTestLoading(false)
  }

  const canTest = chatbotEnabled && !!apiKey

  if (planLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isFree) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <UpgradePrompt feature="Chatbot AI WhatsApp" requiredPlan="PRO" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard/settings" className="text-sm text-gray-500 hover:text-black flex items-center gap-1">
          <ArrowLeft size={14} />
          Impostazioni
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chatbot AI WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-1">
          Rispondi automaticamente ai messaggi WhatsApp dei tuoi clienti con un assistente AI.
        </p>
      </div>

      {/* Configurazione */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Configurazione</h2>

        {/* Toggle abilitazione */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-medium text-sm text-gray-900">Abilita Chatbot AI</p>
            <p className="text-xs text-gray-500 mt-0.5">Il chatbot risponderà automaticamente ai messaggi in entrata</p>
          </div>
          <button
            onClick={() => setChatbotEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${chatbotEnabled ? 'bg-black' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${chatbotEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Provider AI</label>
          <div className="grid grid-cols-2 gap-3">
            {(['openai', 'anthropic'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  provider === p
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {p === 'openai' ? 'OpenAI' : 'Anthropic'}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">API Key</label>
            <a
              href={provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-black"
            >
              Ottieni API key
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
            />
            <button
              onClick={() => setShowApiKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* System prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Personalità e istruzioni</label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={5}
            placeholder={`Sei l'assistente virtuale di [nome azienda]. Rispondi sempre in modo cordiale e professionale. Parla solo di argomenti relativi alla nostra attività e al programma fedeltà. Non rispondere a domande fuori tema.`}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Scrivi come vuoi che si comporti l&apos;assistente. Non serve includere i dati del cliente: vengono aggiunti automaticamente.
          </p>
        </div>

        {/* Contesto automatico */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Variabili iniettate automaticamente nel contesto AI:</p>
          <div className="grid grid-cols-2 gap-1">
            {['Nome cliente', 'Bollini attuali', 'Programma fedeltà', 'Premi disponibili', 'Link carta'].map(v => (
              <div key={v} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                {v}
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={saveConfig}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved ? 'bg-green-100 text-green-700' : 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'
            }`}
          >
            {saving ? 'Salvataggio...' : saved ? 'Salvato!' : 'Salva configurazione'}
          </button>
        </div>
      </div>

      {/* Test chatbot */}
      {canTest && (
        <div className="bg-white border border-[#E8E8E8] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-gray-600" />
            <h2 className="font-semibold text-gray-900">Test chatbot</h2>
          </div>
          <p className="text-sm text-gray-500">Simula una conversazione con il tuo chatbot AI.</p>

          {/* Chat messages */}
          <div className="min-h-[120px] max-h-[300px] overflow-y-auto space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Scrivi un messaggio per iniziare il test...</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    m.role === 'user'
                      ? 'bg-black text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {testLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl rounded-bl-none">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {testError && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{testError}</p>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && runTest()}
              placeholder="Scrivi un messaggio di test..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              disabled={testLoading}
            />
            <button
              onClick={runTest}
              disabled={testLoading || !testMessage.trim()}
              className="px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
