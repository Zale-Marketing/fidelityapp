import jwt from 'jsonwebtoken'

// Configurazione da variabili d'ambiente
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID || ''
const CLIENT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL || ''

// URL base dell'app
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Funzione per ottenere la chiave privata
function getPrivateKey(): string {
  // Prima prova GOOGLE_WALLET_PRIVATE_KEY_BASE64 (formato Vercel)
  if (process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64) {
    try {
      const decoded = Buffer.from(process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64, 'base64').toString('utf-8')
      return decoded.replace(/\\n/g, '\n')
    } catch (e) {
      // Se fallisce il decode, usa il valore diretto (potrebbe essere già PEM)
      return process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64.replace(/\\n/g, '\n')
    }
  }
  
  // Poi prova GOOGLE_WALLET_PRIVATE_KEY (formato diretto)
  if (process.env.GOOGLE_WALLET_PRIVATE_KEY) {
    return process.env.GOOGLE_WALLET_PRIVATE_KEY.replace(/\\n/g, '\n')
  }
  
  console.error('⚠️ Nessuna chiave privata Google Wallet trovata!')
  return ''
}

// Funzione per pulire gli ID
function sanitizeId(id: string): string {
  return id.replace(/-/g, '').substring(0, 32)
}

// Tipo per i dati del programma
type WalletCardData = {
  programId: string
  cardId: string
  scanToken: string
  programName: string
  issuerName: string
  backgroundColor?: string
  logoUrl?: string
  programType: 'stamps' | 'points' | 'cashback' | 'tiers' | 'subscription' | 'missions'
  stampCount?: number
  stampsRequired?: number
  pointsBalance?: number
  pointsForReward?: number
  cashbackBalance?: number
  cashbackPercent?: number
  currentTier?: string
  tierDiscount?: number
  totalSpent?: number
  subscriptionStatus?: string
  subscriptionEnd?: string
  dailyUses?: number
  dailyLimit?: number
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

  let pointsLabel = 'Timbri'
  let pointsBalance: number = 0
  let heroImageUrl = `${APP_URL}/api/wallet-image?type=${data.programType}&color=${encodeURIComponent(data.backgroundColor || '#6366f1')}`
  let accountName = 'Cliente'

  switch (data.programType) {
    case 'stamps':
      pointsLabel = 'Bollini'
      pointsBalance = data.stampCount || 0
      heroImageUrl += `&stamps=${data.stampCount || 0}&total=${data.stampsRequired || 10}`
      accountName = `${data.stampCount || 0}/${data.stampsRequired || 10} bollini`
      break
    case 'points':
      pointsLabel = 'Punti'
      pointsBalance = data.pointsBalance || 0
      heroImageUrl += `&points=${data.pointsBalance || 0}&goal=${data.pointsForReward || 100}`
      accountName = `${data.pointsBalance || 0} punti`
      break
    case 'cashback':
      pointsLabel = 'Credito €'
      pointsBalance = Math.floor((data.cashbackBalance || 0) * 100)
      heroImageUrl += `&cashback=${(data.cashbackBalance || 0).toFixed(2)}&percent=${data.cashbackPercent || 5}`
      accountName = `€${(data.cashbackBalance || 0).toFixed(2)} credito`
      break
    case 'tiers':
      pointsLabel = 'Spesa Totale €'
      pointsBalance = Math.floor(data.totalSpent || 0)
      heroImageUrl += `&tier=${encodeURIComponent(data.currentTier || 'Base')}&discount=${data.tierDiscount || 0}&spent=${data.totalSpent || 0}`
      accountName = `${data.currentTier || 'Base'}${data.tierDiscount ? ` (-${data.tierDiscount}%)` : ''}`
      break
    case 'subscription':
      pointsLabel = 'Utilizzi Oggi'
      pointsBalance = data.dailyUses || 0
      const isActive = data.subscriptionStatus === 'active'
      const endDate = data.subscriptionEnd ? new Date(data.subscriptionEnd).toLocaleDateString('it-IT') : ''
      heroImageUrl += `&status=${isActive ? 'active' : 'expired'}&end=${encodeURIComponent(endDate)}&uses=${data.dailyUses || 0}&limit=${data.dailyLimit || 1}`
      accountName = isActive ? `Attivo fino al ${endDate}` : 'Non attivo'
      break
    case 'missions':
      pointsLabel = 'Missioni'
      pointsBalance = 0
      accountName = 'Missioni attive'
      break
  }

  if (data.logoUrl) {
    heroImageUrl += `&logo=${encodeURIComponent(data.logoUrl)}`
  }
  heroImageUrl += `&t=${Date.now()}`

  const loyaltyClass = {
    id: classId,
    issuerName: data.issuerName,
    programName: data.programName,
    programLogo: {
      sourceUri: {
        uri: data.logoUrl || 'https://www.gstatic.com/images/branding/product/2x/google_cloud_64dp.png'
      }
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
    hexBackgroundColor: data.backgroundColor || '#6366f1',
    reviewStatus: 'UNDER_REVIEW',
  }

  const loyaltyObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    accountId: cleanCardId.substring(0, 12),
    accountName: accountName,
    loyaltyPoints: {
      label: pointsLabel,
      balance: { int: pointsBalance },
    },
    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 12),
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
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
  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`

  let pointsLabel = 'Timbri'
  let pointsBalance = 0
  let heroImageUrl = `${APP_URL}/api/wallet-image?type=${data.programType}&color=${encodeURIComponent(data.backgroundColor || '#6366f1')}`

  switch (data.programType) {
    case 'stamps':
      pointsLabel = 'Bollini'
      pointsBalance = data.stampCount || 0
      heroImageUrl += `&stamps=${data.stampCount || 0}&total=${data.stampsRequired || 10}`
      break
    case 'points':
      pointsLabel = 'Punti'
      pointsBalance = data.pointsBalance || 0
      heroImageUrl += `&points=${data.pointsBalance || 0}&goal=${data.pointsForReward || 100}`
      break
    case 'cashback':
      pointsLabel = 'Credito €'
      pointsBalance = Math.floor((data.cashbackBalance || 0) * 100)
      heroImageUrl += `&cashback=${(data.cashbackBalance || 0).toFixed(2)}&percent=${data.cashbackPercent || 5}`
      break
    case 'tiers':
      pointsLabel = 'Spesa Totale €'
      pointsBalance = Math.floor(data.totalSpent || 0)
      heroImageUrl += `&tier=${encodeURIComponent(data.currentTier || 'Base')}&discount=${data.tierDiscount || 0}`
      break
    case 'subscription':
      pointsLabel = 'Utilizzi Oggi'
      pointsBalance = data.dailyUses || 0
      const isActive = data.subscriptionStatus === 'active'
      const endDate = data.subscriptionEnd ? new Date(data.subscriptionEnd).toLocaleDateString('it-IT') : ''
      heroImageUrl += `&status=${isActive ? 'active' : 'expired'}&end=${encodeURIComponent(endDate)}`
      break
  }

  if (data.logoUrl) {
    heroImageUrl += `&logo=${encodeURIComponent(data.logoUrl)}`
  }
  heroImageUrl += `&t=${Date.now()}`

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: {
        loyaltyPoints: { label: pointsLabel, balance: { int: pointsBalance } },
        heroImage: { sourceUri: { uri: heroImageUrl } },
      },
    })
    console.log('✅ Wallet aggiornato')
  } catch (error: any) {
    console.log('⚠️ Wallet non aggiornato:', error.message)
  }
}