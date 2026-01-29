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
  
  termsUrl?: string
  websiteUrl?: string
  walletMessage?: string
  rewardDescription?: string
  
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
// HERO IMAGE URL - 1032x336 High Resolution
// ============================================================================

function getHeroImageUrl(data: WalletCardData): string {
  const baseUrl = `${APP_URL}/api/wallet-image`
  const color = encodeURIComponent(data.backgroundColor || '#6366f1')
  
  let params = `type=${data.programType}&color=${color}`
  
  switch (data.programType) {
    case 'stamps':
      params += `&stamps=${data.stampCount || 0}&total=${data.stampsRequired || 10}`
      if (data.rewardDescription) params += `&reward=${encodeURIComponent(data.rewardDescription)}`
      // Premi a step
      if (data.stampRewards && data.stampRewards.length > 0) {
        params += `&rewards=${encodeURIComponent(JSON.stringify(data.stampRewards))}`
      }
      break
      
    case 'points':
      params += `&points=${data.pointsBalance || 0}&goal=${data.pointsForReward || 100}`
      if (data.rewardDescription) params += `&reward=${encodeURIComponent(data.rewardDescription)}`
      // Premi a step
      if (data.pointsRewards && data.pointsRewards.length > 0) {
        params += `&rewards=${encodeURIComponent(JSON.stringify(data.pointsRewards))}`
      }
      break
      
    case 'cashback':
      params += `&cashback=${(data.cashbackBalance || 0).toFixed(2)}&percent=${data.cashbackPercent || 5}`
      break
      
    case 'tiers':
      params += `&tier=${encodeURIComponent(data.currentTier || 'Base')}`
      params += `&discount=${data.tierDiscount || 0}`
      params += `&spent=${Math.floor(data.totalSpent || 0)}`
      if (data.nextTierName) {
        params += `&next=${encodeURIComponent(data.nextTierName)}&nextmin=${data.nextTierMinSpend || 0}`
      }
      break
      
    case 'subscription':
      const isActive = data.subscriptionStatus === 'active'
      params += `&status=${isActive ? 'active' : 'expired'}`
      if (data.subscriptionEnd) {
        params += `&end=${encodeURIComponent(new Date(data.subscriptionEnd).toLocaleDateString('it-IT'))}`
      }
      params += `&uses=${data.dailyUses || 0}&limit=${data.dailyLimit || 1}`
      break
      
    case 'missions':
      params += `&active=${data.activeMissions || 0}&completed=${data.completedMissions || 0}`
      break
  }
  
  params += `&t=${Date.now()}`
  
  return `${baseUrl}?${params}`
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
  
  const heroImageUrl = getHeroImageUrl(data)
  
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
  
  // Links nel retro della carta
  const links: any[] = []
  
  if (data.termsUrl) {
    links.push({
      uri: data.termsUrl,
      description: 'Regolamento',
      id: 'terms_link'
    })
  }
  
  if (data.websiteUrl) {
    links.push({
      uri: data.websiteUrl,
      description: 'Sito Web',
      id: 'website_link'
    })
  }
  
  // Powered by Zale Marketing - SEMPRE
  links.push({
    uri: 'https://zalemarketing.com',
    description: 'Powered by Zale Marketing',
    id: 'powered_by'
  })
  
  loyaltyClass.linksModuleData = { uris: links }
  
  // Messaggi
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
  // SOLO nome cliente sopra il QR, niente dati duplicati!
  const loyaltyObject: any = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    
    // ID univoco
    accountId: data.customerEmail || data.scanToken.substring(0, 12),
    
    // SOLO IL NOME del cliente - niente altro!
    accountName: data.customerName || 'Cliente',
    
    // QR Code
    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 8).toUpperCase()
    },
    
    // Hero image con tutti i dati
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
// AGGIORNA CARD NEL WALLET
// ============================================================================

export async function updateWalletCard(data: WalletCardData): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) return
  
  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`
  
  const heroImageUrl = getHeroImageUrl(data)

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
    console.log(`✅ Wallet aggiornato`)
  } catch (error: any) {
    if (error.code === 404) {
      console.log('ℹ️ Carta non ancora nel wallet')
    } else {
      console.log('⚠️ Wallet update error:', error.message)
    }
  }
}

// ============================================================================
// AGGIORNA CLASSE
// ============================================================================

export async function updateWalletClass(data: {
  programId: string
  programName: string
  issuerName: string
  backgroundColor?: string
  logoUrl?: string
}): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) return
  
  const cleanProgramId = sanitizeId(data.programId)
  const classId = `${ISSUER_ID}.${cleanProgramId}`

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  const updateData: any = {
    programName: data.programName,
    issuerName: data.issuerName,
  }
  
  if (data.backgroundColor) {
    updateData.hexBackgroundColor = data.backgroundColor
  }

  if (data.logoUrl) {
    updateData.programLogo = {
      sourceUri: { uri: data.logoUrl }
    }
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${classId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log(`✅ Classe Wallet aggiornata`)
  } catch (error: any) {
    console.log('⚠️ Classe non aggiornata:', error.message)
  }
}