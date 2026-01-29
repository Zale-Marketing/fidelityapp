import jwt from 'jsonwebtoken'

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''
const CLIENT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getPrivateKey(): string {
  if (process.env.GOOGLE_WALLET_PRIVATE_KEY) {
    return process.env.GOOGLE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n')
  }
  if (process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
      return decoded.replace(/\\n/g, '\n')
    } catch {
      return process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64.replace(/\\n/g, '\n')
    }
  }
  return ''
}

function sanitizeId(id: string): string {
  return id.replace(/-/g, '').substring(0, 32)
}

// ============================================================================
// TIPI
// ============================================================================

export type ProgramType = 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'

export type WalletCardData = {
  programId: string
  cardId: string
  scanToken: string
  
  programName: string
  issuerName: string
  programType: ProgramType
  
  backgroundColor: string
  logoUrl?: string
  
  // Link esterni (dal form)
  externalRewardsUrl?: string  // Link Catalogo Premi
  rulesUrl?: string            // Link Regolamento (vecchio campo)
  termsUrl?: string            // Link Regolamento (Google Wallet)
  websiteUrl?: string          // Sito Web
  walletMessage?: string       // Messaggio personalizzato
  rewardDescription?: string   // Premio
  
  // STAMPS
  stampCount?: number
  stampsRequired?: number
  stampRewards?: Array<{ stamps: number, reward: string }>
  
  // POINTS
  pointsBalance?: number
  pointsForReward?: number
  pointsRewards?: Array<{ points: number, reward: string }>
  
  // CASHBACK
  cashbackBalance?: number
  cashbackPercent?: number
  
  // TIERS
  currentTier?: string
  tierDiscount?: number
  totalSpent?: number
  nextTierName?: string
  nextTierMinSpend?: number
  
  // SUBSCRIPTION
  subscriptionStatus?: string
  subscriptionEnd?: string
  dailyUses?: number
  dailyLimit?: number
  
  // MISSIONS
  activeMissions?: number
  completedMissions?: number
  
  // Customer
  customerName?: string
  customerEmail?: string
}

// ============================================================================
// HERO IMAGE URL - SEMPLIFICATO con cardId
// I dati vengono caricati dal database nel route.tsx
// Il timestamp forza il refresh ad ogni chiamata
// ============================================================================

function getHeroImageUrl(cardId: string): string {
  // SEMPLICE: passa solo cardId + timestamp per forzare refresh ISTANTANEO
  return `${APP_URL}/api/wallet-image?cardId=${cardId}&t=${Date.now()}`
}

// ============================================================================
// GENERA LINK WALLET
// ============================================================================

export async function generateWalletLink(data: WalletCardData): Promise<string> {
  const PRIVATE_KEY = getPrivateKey()
  
  if (!ISSUER_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google Wallet non configurato')
  }

  const cleanProgramId = sanitizeId(data.programId)
  const cleanCardId = sanitizeId(data.cardId)
  
  const classId = `${ISSUER_ID}.${cleanProgramId}`
  const objectId = `${ISSUER_ID}.${cleanCardId}`
  
  // Hero image URL con cardId (i dati vengono caricati dal DB)
  const heroImageUrl = getHeroImageUrl(data.cardId)
  
  // ========== LOYALTY CLASS ==========
  const loyaltyClass: any = {
    id: classId,
    issuerName: data.issuerName,
    programName: data.programName,
    
    programLogo: {
      sourceUri: {
        uri: data.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.programName)}&background=${data.backgroundColor.replace('#', '')}&color=fff&size=256&bold=true`
      },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.issuerName }
      }
    },
    
    hexBackgroundColor: data.backgroundColor || '#6366f1',
    
    heroImage: {
      sourceUri: { uri: heroImageUrl },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.programName }
      }
    },
    
    // ⭐ EFFETTO ARCOBALENO SUL QR CODE
    securityAnimation: {
      animationType: 'FOIL_SHIMMER'
    },
    
    reviewStatus: 'UNDER_REVIEW',
  }
  
  // ========== LINKS NEL RETRO DELLA CARTA ==========
  // IMPORTANTE: description è quello che appare come label (max 20 caratteri consigliati)
  const links: any[] = []
  
  // Link Catalogo Premi
  if (data.externalRewardsUrl) {
    links.push({
      uri: data.externalRewardsUrl.startsWith('http') ? data.externalRewardsUrl : `https://${data.externalRewardsUrl}`,
      description: 'Catalogo Premi',
      id: 'rewards_link'
    })
  }
  
  // Link Regolamento (usa termsUrl se presente, altrimenti rulesUrl)
  const regolamentoUrl = data.termsUrl || data.rulesUrl
  if (regolamentoUrl) {
    links.push({
      uri: regolamentoUrl.startsWith('http') ? regolamentoUrl : `https://${regolamentoUrl}`,
      description: 'Regolamento',
      id: 'terms_link'
    })
  }
  
  // Sito Web
  if (data.websiteUrl) {
    links.push({
      uri: data.websiteUrl.startsWith('http') ? data.websiteUrl : `https://${data.websiteUrl}`,
      description: 'Sito Web',
      id: 'website_link'
    })
  }
  
  // Powered by Zale Marketing - SEMPRE in fondo
  links.push({
    uri: 'https://zalemarketing.it',
    description: 'Zale Marketing',
    id: 'powered_by'
  })
  
  loyaltyClass.linksModuleData = { uris: links }
  
  // ========== MESSAGGI (opzionali) ==========
  const messages: any[] = []
  
  if (data.walletMessage) {
    messages.push({
      header: 'Info',
      body: data.walletMessage,
      id: 'custom_message'
    })
  }
  
  if (data.rewardDescription) {
    messages.push({
      header: 'Premio',
      body: data.rewardDescription,
      id: 'reward_message'
    })
  }
  
  if (messages.length > 0) {
    loyaltyClass.messages = messages
  }

  // ========== LOYALTY OBJECT ==========
  // SOLO nome cliente sopra il QR, NIENTE dati duplicati!
  const loyaltyObject: any = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    
    // ID univoco
    accountId: data.customerEmail || data.scanToken.substring(0, 12),
    
    // ⭐ SOLO IL NOME del cliente - niente altro sopra il QR!
    accountName: data.customerName || 'Cliente',
    
    // QR Code
    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 8).toUpperCase()
    },
    
    // Hero image con tutti i dati visivi
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
  }

  // ========== GENERA JWT ==========
  const claims = {
    iss: CLIENT_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  }

  const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: 'RS256' })
  return `https://pay.google.com/gp/v/save/${token}`
}

// ============================================================================
// AGGIORNA CARD NEL WALLET (solo dati oggetto - bollini, punti, saldo)
// ============================================================================

export async function updateWalletCard(data: WalletCardData): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) return
  
  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`
  
  // Hero image URL con cardId e timestamp per refresh istantaneo
  const heroImageUrl = getHeroImageUrl(data.cardId)

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  const updateData: any = {
    accountName: data.customerName || 'Cliente',
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log(`✅ Wallet aggiornato: ${objectId}`)
  } catch (error: any) {
    if (error.code === 404) {
      console.log('ℹ️ Carta non ancora nel wallet')
    } else {
      console.log('⚠️ Wallet update error:', error.message)
    }
  }
}

// ============================================================================
// NOTA IMPORTANTE SUGLI UPDATE
// ============================================================================
// 
// Le modifiche alla CLASSE (logo, nome programma, colori) NON si applicano
// alle carte già salvate nel wallet degli utenti.
// 
// Solo le modifiche all'OGGETTO (bollini, punti, saldo, hero image) si
// aggiornano in tempo reale tramite PATCH API.
// 
// Questo è un limite tecnico di Google Wallet, non del nostro sistema.
//