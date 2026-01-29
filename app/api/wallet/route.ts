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

// Tipo completo per i dati del programma
export type WalletCardData = {
  // IDs
  programId: string
  cardId: string
  scanToken: string
  merchantId: string
  
  // Info base
  programName: string
  issuerName: string
  programType: 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'
  
  // Design
  backgroundColor?: string
  secondaryColor?: string
  logoUrl?: string
  heroImageUrl?: string
  
  // Links
  termsUrl?: string
  websiteUrl?: string
  
  // Messaggi
  walletMessage?: string
  rewardDescription?: string
  
  // Stamps
  stampCount?: number
  stampsRequired?: number
  
  // Points
  pointsBalance?: number
  pointsForReward?: number
  pointsPerEuro?: number
  
  // Cashback
  cashbackBalance?: number
  cashbackPercent?: number
  minCashbackRedeem?: number
  
  // Tiers
  currentTier?: string
  tierDiscount?: number
  totalSpent?: number
  nextTierName?: string
  nextTierMinSpend?: number
  
  // Subscription
  subscriptionStatus?: string
  subscriptionEnd?: string
  dailyUses?: number
  dailyLimit?: number
  subscriptionPrice?: number
  
  // Missions
  activeMissions?: number
  completedMissions?: number
  
  // Customer
  customerName?: string
  customerEmail?: string
}

// Genera l'immagine Hero URL per ogni tipo
function getHeroImageUrl(data: WalletCardData): string {
  const baseUrl = `${APP_URL}/api/wallet-image`
  const color = encodeURIComponent(data.backgroundColor || '#6366f1')
  
  let url = `${baseUrl}?type=${data.programType}&color=${color}`
  
  switch (data.programType) {
    case 'stamps':
      url += `&stamps=${data.stampCount || 0}&total=${data.stampsRequired || 10}`
      break
    case 'points':
      url += `&points=${data.pointsBalance || 0}&goal=${data.pointsForReward || 100}`
      break
    case 'cashback':
      url += `&cashback=${(data.cashbackBalance || 0).toFixed(2)}&percent=${data.cashbackPercent || 5}`
      break
    case 'tiers':
      url += `&tier=${encodeURIComponent(data.currentTier || 'Base')}&discount=${data.tierDiscount || 0}&spent=${Math.floor(data.totalSpent || 0)}`
      if (data.nextTierName) {
        url += `&next=${encodeURIComponent(data.nextTierName)}&nextmin=${data.nextTierMinSpend || 0}`
      }
      break
    case 'subscription':
      const isActive = data.subscriptionStatus === 'active'
      const endDate = data.subscriptionEnd ? new Date(data.subscriptionEnd).toLocaleDateString('it-IT') : ''
      url += `&status=${isActive ? 'active' : 'expired'}&end=${encodeURIComponent(endDate)}&uses=${data.dailyUses || 0}&limit=${data.dailyLimit || 1}`
      break
    case 'missions':
      url += `&active=${data.activeMissions || 0}&completed=${data.completedMissions || 0}`
      break
  }
  
  // Aggiungi timestamp per evitare cache
  url += `&t=${Date.now()}`
  
  return url
}

// Configura i dettagli in base al tipo
function getTypeConfig(data: WalletCardData) {
  let pointsLabel = ''
  let pointsBalance = 0
  let accountName = ''
  let secondaryLabel = ''
  let secondaryValue = ''
  
  switch (data.programType) {
    case 'stamps':
      pointsLabel = 'Bollini'
      pointsBalance = data.stampCount || 0
      accountName = `${data.stampCount || 0}/${data.stampsRequired || 10} bollini`
      secondaryLabel = 'Premio'
      secondaryValue = data.rewardDescription || 'Premio speciale'
      break
      
    case 'points':
      pointsLabel = 'Punti'
      pointsBalance = data.pointsBalance || 0
      accountName = `${data.pointsBalance || 0} punti`
      secondaryLabel = 'Per il premio'
      secondaryValue = `${data.pointsForReward || 100} punti`
      break
      
    case 'cashback':
      pointsLabel = 'Credito'
      pointsBalance = Math.floor((data.cashbackBalance || 0) * 100) // Centesimi
      accountName = `€${(data.cashbackBalance || 0).toFixed(2)} disponibili`
      secondaryLabel = 'Guadagno'
      secondaryValue = `${data.cashbackPercent || 5}% su ogni acquisto`
      break
      
    case 'tiers':
      pointsLabel = 'Spesa Totale'
      pointsBalance = Math.floor(data.totalSpent || 0)
      accountName = data.currentTier || 'Base'
      if (data.tierDiscount && data.tierDiscount > 0) {
        secondaryLabel = 'Sconto'
        secondaryValue = `-${data.tierDiscount}% su tutto`
      } else {
        secondaryLabel = 'Prossimo livello'
        secondaryValue = data.nextTierName || 'Non disponibile'
      }
      break
      
    case 'subscription':
      pointsLabel = 'Utilizzi Oggi'
      pointsBalance = data.dailyUses || 0
      const isActive = data.subscriptionStatus === 'active'
      if (isActive && data.subscriptionEnd) {
        const endDate = new Date(data.subscriptionEnd).toLocaleDateString('it-IT')
        accountName = `Attivo fino al ${endDate}`
      } else {
        accountName = 'Non attivo'
      }
      secondaryLabel = 'Limite giornaliero'
      secondaryValue = `${data.dailyLimit || 1} utilizzi`
      break
      
    case 'missions':
      pointsLabel = 'Missioni Completate'
      pointsBalance = data.completedMissions || 0
      accountName = `${data.activeMissions || 0} missioni attive`
      secondaryLabel = 'Stato'
      secondaryValue = 'In corso'
      break
  }
  
  return { pointsLabel, pointsBalance, accountName, secondaryLabel, secondaryValue }
}

// Genera il link "Add to Google Wallet"
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
  const config = getTypeConfig(data)
  
  // Icona tipo
  const typeIcons: Record<string, string> = {
    stamps: '🎫',
    points: '⭐',
    cashback: '💰',
    tiers: '👑',
    subscription: '🔄',
    missions: '🎮'
  }

  // CLASSE - Template del programma
  const loyaltyClass: any = {
    id: classId,
    issuerName: data.issuerName,
    programName: `${typeIcons[data.programType] || '🎁'} ${data.programName}`,
    programLogo: {
      sourceUri: {
        uri: data.logoUrl || 'https://www.gstatic.com/images/branding/product/2x/google_cloud_64dp.png'
      },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.issuerName }
      }
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.programName }
      }
    },
    hexBackgroundColor: data.backgroundColor || '#6366f1',
    reviewStatus: 'UNDER_REVIEW',
    // Links opzionali
    ...(data.termsUrl && {
      linksModuleData: {
        uris: [
          ...(data.termsUrl ? [{
            uri: data.termsUrl,
            description: 'Regolamento',
            id: 'terms'
          }] : []),
          ...(data.websiteUrl ? [{
            uri: data.websiteUrl,
            description: 'Sito Web',
            id: 'website'
          }] : [])
        ]
      }
    }),
    // Messaggio personalizzato
    ...(data.walletMessage && {
      messages: [{
        header: 'Info',
        body: data.walletMessage,
        id: 'info_message'
      }]
    })
  }

  // OGGETTO - Card del cliente
  const loyaltyObject: any = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    accountId: data.customerEmail || cleanCardId.substring(0, 12),
    accountName: config.accountName,
    loyaltyPoints: {
      label: config.pointsLabel,
      balance: { int: config.pointsBalance },
    },
    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 12),
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
    // Info aggiuntive
    textModulesData: [
      {
        header: config.secondaryLabel,
        body: config.secondaryValue,
        id: 'secondary_info'
      }
    ]
  }
  
  // Aggiungi nome cliente se disponibile
  if (data.customerName) {
    loyaltyObject.textModulesData.push({
      header: 'Cliente',
      body: data.customerName,
      id: 'customer_name'
    })
  }

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

// Aggiorna la card nel Wallet
export async function updateWalletCard(data: WalletCardData): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY) return
  
  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`
  
  const heroImageUrl = getHeroImageUrl(data)
  const config = getTypeConfig(data)

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  const updateData: any = {
    accountName: config.accountName,
    loyaltyPoints: {
      label: config.pointsLabel,
      balance: { int: config.pointsBalance },
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
    textModulesData: [
      {
        header: config.secondaryLabel,
        body: config.secondaryValue,
        id: 'secondary_info'
      }
    ]
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log('✅ Wallet aggiornato:', config.pointsLabel, config.pointsBalance)
  } catch (error: any) {
    console.log('⚠️ Wallet non aggiornato:', error.message)
  }
}

// Aggiorna solo la classe (quando merchant modifica il programma)
export async function updateWalletClass(data: {
  programId: string
  programName: string
  issuerName: string
  programType: string
  backgroundColor?: string
  logoUrl?: string
  termsUrl?: string
  websiteUrl?: string
  walletMessage?: string
}): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY) return
  
  const cleanProgramId = sanitizeId(data.programId)
  const classId = `${ISSUER_ID}.${cleanProgramId}`

  const typeIcons: Record<string, string> = {
    stamps: '🎫', points: '⭐', cashback: '💰',
    tiers: '👑', subscription: '🔄', missions: '🎮'
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  const updateData: any = {
    programName: `${typeIcons[data.programType] || '🎁'} ${data.programName}`,
    hexBackgroundColor: data.backgroundColor || '#6366f1',
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
    console.log('✅ Classe Wallet aggiornata:', data.programName)
  } catch (error: any) {
    console.log('⚠️ Classe Wallet non aggiornata:', error.message)
  }
}