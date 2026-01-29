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
  // IDs
  programId: string
  cardId: string
  scanToken: string
  
  // Info base
  programName: string
  issuerName: string
  programType: ProgramType
  
  // Design
  backgroundColor: string
  logoUrl?: string
  
  // Links (mostrati nel retro della carta)
  termsUrl?: string
  websiteUrl?: string
  
  // Messaggi
  walletMessage?: string
  rewardDescription?: string
  
  // STAMPS
  stampCount?: number
  stampsRequired?: number
  
  // POINTS
  pointsBalance?: number
  pointsForReward?: number
  
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
      break
      
    case 'points':
      params += `&points=${data.pointsBalance || 0}&goal=${data.pointsForReward || 100}`
      if (data.rewardDescription) params += `&reward=${encodeURIComponent(data.rewardDescription)}`
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
  
  // Cache buster
  params += `&t=${Date.now()}`
  
  return `${baseUrl}?${params}`
}

// ============================================================================
// CONFIGURAZIONE PER TIPO - Cosa mostrare e dove
// ============================================================================

function getCardConfig(data: WalletCardData) {
  // Valori per loyaltyPoints (il contatore principale mostrato in alto)
  let pointsLabel = ''
  let pointsValue = 0
  
  // Account name (testo sotto il nome programma)
  let accountName = ''
  
  // Campi aggiuntivi per textModulesData (mostrati nel dettaglio)
  const textModules: Array<{ id: string, header: string, body: string }> = []
  
  switch (data.programType) {
    case 'stamps':
      pointsLabel = 'Bollini'
      pointsValue = data.stampCount || 0
      accountName = data.customerName || 'Cliente'
      
      textModules.push({
        id: 'progress',
        header: 'Progresso',
        body: `${data.stampCount || 0} di ${data.stampsRequired || 10} bollini`
      })
      
      if (data.rewardDescription) {
        textModules.push({
          id: 'reward',
          header: 'Premio',
          body: data.rewardDescription
        })
      }
      
      if ((data.stampCount || 0) >= (data.stampsRequired || 10)) {
        textModules.push({
          id: 'status',
          header: '🎉 Congratulazioni!',
          body: 'Hai raggiunto il premio! Presentati in cassa per riscattarlo.'
        })
      }
      break
      
    case 'points':
      pointsLabel = 'Punti'
      pointsValue = data.pointsBalance || 0
      accountName = data.customerName || 'Cliente'
      
      const remaining = (data.pointsForReward || 100) - (data.pointsBalance || 0)
      if (remaining > 0) {
        textModules.push({
          id: 'remaining',
          header: 'Per il premio',
          body: `Ancora ${remaining} punti`
        })
      } else {
        textModules.push({
          id: 'status',
          header: '🎉 Premio disponibile!',
          body: 'Presentati in cassa per riscattarlo.'
        })
      }
      
      if (data.rewardDescription) {
        textModules.push({
          id: 'reward',
          header: 'Premio',
          body: data.rewardDescription
        })
      }
      break
      
    case 'cashback':
      pointsLabel = 'Credito €'
      pointsValue = Math.round((data.cashbackBalance || 0) * 100) // centesimi per int
      accountName = data.customerName || 'Cliente'
      
      textModules.push({
        id: 'balance',
        header: 'Saldo disponibile',
        body: `€${(data.cashbackBalance || 0).toFixed(2)}`
      })
      
      textModules.push({
        id: 'earning',
        header: 'Guadagno',
        body: `+${data.cashbackPercent || 5}% su ogni acquisto`
      })
      break
      
    case 'tiers':
      pointsLabel = 'Spesa €'
      pointsValue = Math.floor(data.totalSpent || 0)
      accountName = data.currentTier || 'Base'
      
      if ((data.tierDiscount || 0) > 0) {
        textModules.push({
          id: 'discount',
          header: 'Il tuo sconto',
          body: `-${data.tierDiscount}% su tutti gli acquisti`
        })
      }
      
      if (data.nextTierName) {
        const toNext = (data.nextTierMinSpend || 0) - (data.totalSpent || 0)
        textModules.push({
          id: 'next',
          header: 'Prossimo livello',
          body: `${data.nextTierName} (mancano €${Math.max(0, toNext).toFixed(0)})`
        })
      }
      break
      
    case 'subscription':
      const isActive = data.subscriptionStatus === 'active'
      pointsLabel = 'Utilizzi oggi'
      pointsValue = data.dailyUses || 0
      accountName = isActive ? 'Abbonamento Attivo' : 'Abbonamento Scaduto'
      
      if (isActive && data.subscriptionEnd) {
        textModules.push({
          id: 'expiry',
          header: 'Valido fino al',
          body: new Date(data.subscriptionEnd).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        })
      }
      
      textModules.push({
        id: 'limit',
        header: 'Utilizzi giornalieri',
        body: `${data.dailyUses || 0} di ${data.dailyLimit || 1}`
      })
      
      if (!isActive) {
        textModules.push({
          id: 'renew',
          header: '⚠️ Abbonamento scaduto',
          body: 'Rinnova il tuo abbonamento per continuare a usufruire dei vantaggi.'
        })
      }
      break
      
    case 'missions':
      pointsLabel = 'Completate'
      pointsValue = data.completedMissions || 0
      accountName = data.customerName || 'Cliente'
      
      textModules.push({
        id: 'active',
        header: 'Missioni attive',
        body: `${data.activeMissions || 0} missioni da completare`
      })
      
      if ((data.completedMissions || 0) > 0) {
        textModules.push({
          id: 'completed',
          header: '🏆 Missioni completate',
          body: `Hai completato ${data.completedMissions} missioni!`
        })
      }
      break
  }
  
  // Aggiungi nome cliente se non già usato come accountName
  if (data.customerName && accountName !== data.customerName) {
    textModules.push({
      id: 'customer',
      header: 'Intestatario',
      body: data.customerName
    })
  }
  
  return { pointsLabel, pointsValue, accountName, textModules }
}

// ============================================================================
// GENERA LINK WALLET - Con tutte le feature professionali
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
  const config = getCardConfig(data)
  
  // ========== LOYALTY CLASS (Template del programma) ==========
  const loyaltyClass: any = {
    id: classId,
    issuerName: data.issuerName,
    programName: data.programName,
    
    // Logo circolare in alto a sinistra
    programLogo: {
      sourceUri: {
        uri: data.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.programName)}&background=${data.backgroundColor.replace('#', '')}&color=fff&size=256&bold=true`
      },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.issuerName }
      }
    },
    
    // Colore sfondo
    hexBackgroundColor: data.backgroundColor || '#6366f1',
    
    // Hero image (banner in basso) - 1032x336
    heroImage: {
      sourceUri: { uri: heroImageUrl },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.programName }
      }
    },
    
    // ⭐ EFFETTO ARCOBALENO SUL QR CODE!
    securityAnimation: {
      animationType: 'FOIL_SHIMMER'
    },
    
    reviewStatus: 'UNDER_REVIEW',
  }
  
  // Links (appaiono nel "retro" della carta quando si clicca "Dettagli")
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
  
  if (links.length > 0) {
    loyaltyClass.linksModuleData = { uris: links }
  }
  
  // Messaggio personalizzato (appare come notifica/info)
  if (data.walletMessage) {
    loyaltyClass.messages = [{
      header: 'Info',
      body: data.walletMessage,
      id: 'custom_message'
    }]
  }

  // ========== LOYALTY OBJECT (Card del cliente) ==========
  const loyaltyObject: any = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    
    // Account ID (identificativo univoco)
    accountId: data.customerEmail || data.scanToken.substring(0, 12),
    
    // Account Name (mostrato sotto il nome programma)
    accountName: config.accountName,
    
    // Contatore principale (Bollini, Punti, Credito, ecc.)
    loyaltyPoints: {
      label: config.pointsLabel,
      balance: {
        int: config.pointsValue
      }
    },
    
    // QR Code per scansione
    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 8).toUpperCase()
    },
    
    // Hero image anche sull'oggetto (per aggiornamenti real-time)
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
    
    // Informazioni aggiuntive (mostrate nei dettagli)
    textModulesData: config.textModules
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
// AGGIORNA CARD NEL WALLET (Real-time dopo scansione)
// ============================================================================

export async function updateWalletCard(data: WalletCardData): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) return
  
  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`
  
  const heroImageUrl = getHeroImageUrl(data)
  const config = getCardConfig(data)

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()

  // Dati da aggiornare
  const updateData: any = {
    accountName: config.accountName,
    loyaltyPoints: {
      label: config.pointsLabel,
      balance: { int: config.pointsValue },
    },
    heroImage: {
      sourceUri: { uri: heroImageUrl }
    },
    textModulesData: config.textModules
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log(`✅ Wallet aggiornato: ${config.pointsLabel} = ${config.pointsValue}`)
  } catch (error: any) {
    // Se l'oggetto non esiste, è normale (carta non ancora aggiunta al wallet)
    if (error.code === 404) {
      console.log('ℹ️ Carta non ancora nel wallet, skip update')
    } else {
      console.log('⚠️ Wallet update error:', error.message)
    }
  }
}

// ============================================================================
// AGGIORNA CLASSE (Quando il merchant modifica il programma)
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
    console.log(`✅ Classe Wallet aggiornata: ${data.programName}`)
  } catch (error: any) {
    console.log('⚠️ Classe non aggiornata:', error.message)
  }
}