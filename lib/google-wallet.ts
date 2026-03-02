import jwt from 'jsonwebtoken'
import { getNextRewardText } from './wallet-helpers'

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
  externalRewardsUrl?: string
  rulesUrl?: string
  termsUrl?: string
  websiteUrl?: string
  walletMessage?: string
  rewardDescription?: string

  // STAMPS
  stampCount?: number
  stampsRequired?: number
  stampRewards?: Array<{ stamps: number; reward: string }>
  dbRewards?: Array<{ stamps_required: number; name: string; [key: string]: any }>

  // POINTS
  pointsBalance?: number
  pointsForReward?: number
  pointsRewards?: Array<{ points: number; reward: string }>
  pointsPerEuro?: number   // €X per 1 punto

  // CASHBACK
  cashbackBalance?: number
  cashbackPercent?: number
  minCashbackRedeem?: number  // minimo € per riscattare

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
  subscriptionPrice?: number
  subscriptionPeriod?: string

  // MISSIONS
  activeMissions?: number
  completedMissions?: number

  // Customer
  customerName?: string
  customerEmail?: string
}

// ============================================================================
// HERO IMAGE URL
// ============================================================================

function getHeroImageUrl(cardId: string): string {
  return `${APP_URL}/api/wallet-image?cardId=${cardId}&t=${Date.now()}`
}

// ============================================================================
// LOYALTY POINTS — campo nativo Google Wallet (grande, visibile sulla carta)
// ============================================================================

function buildLoyaltyPoints(data: WalletCardData): any {
  switch (data.programType) {
    case 'stamps':
      return {
        label: 'BOLLINI',
        balance: { string: `${data.stampCount || 0} / ${data.stampsRequired || 10}` },
      }
    case 'points':
      return {
        label: 'PUNTI',
        balance: { int: Math.round(data.pointsBalance || 0) },
      }
    case 'cashback':
      return {
        label: 'CREDITO',
        balance: { string: `\u20AC${(data.cashbackBalance || 0).toFixed(2)}` },
      }
    case 'tiers':
      return {
        label: 'LIVELLO',
        balance: { string: (data.currentTier || 'Base').toUpperCase() },
      }
    case 'subscription':
      return {
        label: 'STATO',
        balance: { string: data.subscriptionStatus === 'active' ? 'ATTIVO' : 'SCADUTO' },
      }
    default:
      return { label: 'PUNTI', balance: { int: 0 } }
  }
}

// ============================================================================
// CLASS TEMPLATE INFO — layout nativo delle righe sulla carta Google Wallet
// ============================================================================

function buildClassTemplateInfo(programType: ProgramType): any {
  const barcodeBranding = {
    firstBottomDetail: {
      fieldSelector: { fields: [{ fieldPath: "object.textModulesData['branding']" }] },
    },
  }

  let cardRowTemplateInfos: any[]

  switch (programType) {
    case 'stamps':
      cardRowTemplateInfos = [
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['premio']" }] },
            },
          },
        },
      ]
      break

    case 'points':
      cardRowTemplateInfos = [
        {
          threeItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['conversione']" }] },
            },
            middleItem: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['premio']" }] },
            },
          },
        },
      ]
      break

    case 'cashback':
      cardRowTemplateInfos = [
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['info']" }] },
            },
          },
        },
        {
          oneItem: {
            item: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['stato']" }] },
            },
          },
        },
      ]
      break

    case 'tiers':
      cardRowTemplateInfos = [
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['sconto']" }] },
            },
          },
        },
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['spesa']" }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['prossimo_tier']" }] },
            },
          },
        },
      ]
      break

    case 'subscription':
      cardRowTemplateInfos = [
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['scadenza']" }] },
            },
          },
        },
        {
          twoItems: {
            startItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['utilizzi']" }] },
            },
            endItem: {
              firstValue: { fields: [{ fieldPath: "object.textModulesData['prezzo']" }] },
            },
          },
        },
      ]
      break

    default:
      cardRowTemplateInfos = [
        {
          oneItem: {
            item: {
              firstValue: { fields: [{ fieldPath: 'object.loyaltyPoints.balance' }] },
            },
          },
        },
      ]
  }

  return {
    cardTemplateOverride: { cardRowTemplateInfos },
    cardBarcodeSectionDetails: barcodeBranding,
  }
}

// ============================================================================
// TEXT MODULES — dati nella vista espansa e nei campi cardTemplateOverride
// ============================================================================

function buildTextModulesData(data: WalletCardData): any[] {
  const modules: any[] = []

  switch (data.programType) {
    case 'stamps': {
      const currentStamps = data.stampCount ?? 0
      const total = data.stampsRequired || 10
      const { header: prizeHeader, body: prizeBody } = getNextRewardText(
        currentStamps,
        total,
        data.rewardDescription || '',
        data.dbRewards || []
      )
      modules.push({
        id: 'premio',
        header: prizeHeader,
        body: prizeBody,
      })
      break
    }

    case 'points': {
      const points = Math.round(data.pointsBalance || 0)
      const total = data.pointsForReward || 100
      const isComplete = points >= total
      const nextReward = data.pointsRewards?.find((r) => r.points > points)
      modules.push({
        id: 'premio',
        header: 'PROSSIMO PREMIO',
        body: isComplete
          ? `PRONTO: ${data.rewardDescription || ''}`
          : nextReward
          ? `${nextReward.reward} a ${nextReward.points}pt`
          : `${data.rewardDescription || ''} a ${total}pt`,
      })
      modules.push({
        id: 'conversione',
        header: 'GUADAGNI',
        body: `1 pt ogni \u20AC${data.pointsPerEuro || 1}`,
      })
      break
    }

    case 'cashback': {
      const cashback = data.cashbackBalance || 0
      const minRedeem = data.minCashbackRedeem || 5
      const canRedeem = cashback >= minRedeem
      modules.push({
        id: 'info',
        header: 'GUADAGNI',
        body: `+${data.cashbackPercent || 5}% su ogni acquisto`,
      })
      modules.push({
        id: 'stato',
        header: 'STATO',
        body: canRedeem ? 'Disponibile ora!' : `Min. \u20AC${minRedeem} per riscattare`,
      })
      break
    }

    case 'tiers': {
      const discount = data.tierDiscount || 0
      const totalSpent = data.totalSpent || 0
      const nextSpend = data.nextTierMinSpend || 0
      const remaining = nextSpend > totalSpent ? Math.ceil(nextSpend - totalSpent) : 0
      modules.push({
        id: 'sconto',
        header: 'TUO SCONTO',
        body: discount > 0 ? `-${discount}% su ogni acquisto` : 'Nessuno sconto attivo',
      })
      modules.push({
        id: 'spesa',
        header: 'SPESA TOTALE',
        body: `\u20AC${totalSpent.toFixed(0)}`,
      })
      modules.push({
        id: 'prossimo_tier',
        header: 'PROSSIMO LIVELLO',
        body: data.nextTierName
          ? `${data.nextTierName} a \u20AC${nextSpend} (+\u20AC${remaining})`
          : 'Livello massimo!',
      })
      break
    }

    case 'subscription': {
      const isActive = data.subscriptionStatus === 'active'
      const endDate = data.subscriptionEnd
        ? new Date(data.subscriptionEnd).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'N/D'
      const periodLabels: Record<string, string> = {
        weekly: 'sett',
        monthly: 'mese',
        yearly: 'anno',
      }
      const periodLabel = periodLabels[data.subscriptionPeriod || 'monthly'] || 'mese'
      modules.push({
        id: 'scadenza',
        header: isActive ? 'SCADE IL' : 'SCADUTO IL',
        body: endDate,
      })
      modules.push({
        id: 'utilizzi',
        header: 'UTILIZZI OGGI',
        body: `${data.dailyUses || 0} / ${data.dailyLimit || 1}`,
      })
      modules.push({
        id: 'prezzo',
        header: 'PIANO',
        body: `\u20AC${data.subscriptionPrice || 0}/${periodLabel}`,
      })
      break
    }
  }

  // Branding — referenziato da cardBarcodeSectionDetails.firstBottomDetail
  modules.push({ id: 'branding', header: '', body: 'Powered by Zale Marketing' })

  return modules
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

  const heroImageUrl = getHeroImageUrl(data.cardId)

  // ========== LOYALTY CLASS ==========
  const loyaltyClass: any = {
    id: classId,
    issuerName: data.issuerName,
    programName: data.programName,

    programLogo: {
      sourceUri: {
        uri: data.logoUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(data.programName)}&background=${data.backgroundColor.replace('#', '')}&color=fff&size=256&bold=true`,
      },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.issuerName },
      },
    },

    hexBackgroundColor: data.backgroundColor || '#6366f1',

    heroImage: {
      sourceUri: { uri: heroImageUrl },
      contentDescription: {
        defaultValue: { language: 'it-IT', value: data.programName },
      },
    },

    // ⭐ Effetto arcobaleno sul QR code
    securityAnimation: { animationType: 'FOIL_SHIMMER' },

    // Layout nativo righe per ogni tipo di programma
    classTemplateInfo: buildClassTemplateInfo(data.programType),

    reviewStatus: 'UNDER_REVIEW',
  }

  // ========== LINKS NEL RETRO DELLA CARTA ==========
  const links: any[] = []

  if (data.externalRewardsUrl) {
    links.push({
      uri: data.externalRewardsUrl.startsWith('http')
        ? data.externalRewardsUrl
        : `https://${data.externalRewardsUrl}`,
      description: 'Catalogo Premi',
      id: 'rewards_link',
    })
  }

  const regolamentoUrl = data.termsUrl || data.rulesUrl
  if (regolamentoUrl) {
    links.push({
      uri: regolamentoUrl.startsWith('http') ? regolamentoUrl : `https://${regolamentoUrl}`,
      description: 'Regolamento',
      id: 'terms_link',
    })
  }

  if (data.websiteUrl) {
    links.push({
      uri: data.websiteUrl.startsWith('http') ? data.websiteUrl : `https://${data.websiteUrl}`,
      description: 'Sito Web',
      id: 'website_link',
    })
  }

  links.push({
    uri: 'https://zalemarketing.it',
    description: 'Zale Marketing',
    id: 'powered_by',
  })

  loyaltyClass.linksModuleData = { uris: links }

  // ========== MESSAGGI (opzionali) ==========
  const messages: any[] = []

  if (data.walletMessage) {
    messages.push({ header: 'Info', body: data.walletMessage, id: 'custom_message' })
  }

  if (data.rewardDescription) {
    messages.push({ header: 'Premio', body: data.rewardDescription, id: 'reward_message' })
  }

  if (messages.length > 0) {
    loyaltyClass.messages = messages
  }

  // ========== LOYALTY OBJECT ==========
  const loyaltyObject: any = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',

    accountId: data.customerEmail || data.scanToken.substring(0, 12),
    accountName: data.customerName || 'Cliente',

    barcode: {
      type: 'QR_CODE',
      value: data.scanToken,
      alternateText: data.scanToken.substring(0, 8).toUpperCase(),
    },

    heroImage: {
      sourceUri: { uri: heroImageUrl },
    },

    // Campo nativo per il bilancio (bollini, punti, credito, livello, stato)
    loyaltyPoints: buildLoyaltyPoints(data),

    // Moduli testo per cardTemplateOverride e vista espansa
    textModulesData: buildTextModulesData(data),
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
// AUTH CLIENT — riusabile da altri moduli (es. send-notification)
// ============================================================================

export async function getAuthClient() {
  const { GoogleAuth } = await import('google-auth-library')
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) throw new Error('Google Wallet non configurato')
  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  return auth.getClient()
}

// ============================================================================
// AGGIORNA CARD NEL WALLET (solo dati oggetto - bollini, punti, saldo)
// ============================================================================

export async function updateWalletCard(data: WalletCardData): Promise<void> {
  const PRIVATE_KEY = getPrivateKey()
  if (!PRIVATE_KEY || !ISSUER_ID) return

  const cleanCardId = sanitizeId(data.cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`

  const heroImageUrl = getHeroImageUrl(data.cardId)

  const client = await getAuthClient()

  const updateData: any = {
    accountName: data.customerName || 'Cliente',
    heroImage: {
      sourceUri: { uri: heroImageUrl },
    },
    loyaltyPoints: buildLoyaltyPoints(data),
    textModulesData: buildTextModulesData(data),
    notifyPreference: 'notifyOnUpdate',
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log(`Wallet aggiornato: ${objectId}`)
  } catch (error: any) {
    if (error.code === 404) {
      console.log('Carta non ancora nel wallet')
    } else {
      console.log('Wallet update error:', error.message)
    }
  }

  // Notifica push TEXT_AND_NOTIFY (separata — se fallisce non blocca l'update)
  let notifHeader: string
  let notifBody: string

  switch (data.programType) {
    case 'stamps': {
      const currentStamps = data.stampCount ?? 0
      const stampsRequired = data.stampsRequired ?? 10
      const { header: prizeHeader, body: prizeBody } = getNextRewardText(
        currentStamps,
        stampsRequired,
        data.rewardDescription || '',
        data.dbRewards || []
      )
      notifHeader = data.programName || 'Bollino aggiunto!'
      notifBody = `Hai ${currentStamps} / ${stampsRequired} bollini. ${prizeHeader}: ${prizeBody}`
      break
    }
    case 'points': {
      const points = Math.round(data.pointsBalance || 0)
      const forReward = data.pointsForReward || 100
      if (points >= forReward) {
        notifHeader = 'Premio raggiunto!'
        notifBody = `Premio raggiunto! Riscatta ora: ${data.rewardDescription || ''}`
      } else {
        notifHeader = 'Punti aggiunti!'
        notifBody = `Hai ${points} punti. Ne mancano ${forReward - points} per il premio: ${data.rewardDescription || ''}`
      }
      break
    }
    case 'cashback': {
      const cashback = data.cashbackBalance || 0
      const minRedeem = data.minCashbackRedeem || 5
      if (cashback >= minRedeem) {
        notifHeader = 'Cashback disponibile!'
        notifBody = `Hai EUR ${cashback.toFixed(2)} da riscattare. Vieni a trovarci!`
      } else {
        notifHeader = 'Cashback aggiornato!'
        notifBody = `Hai EUR ${cashback.toFixed(2)} di credito. Ancora EUR ${(minRedeem - cashback).toFixed(2)} per riscattare`
      }
      break
    }
    case 'tiers': {
      const tierDiscount = data.tierDiscount || 0
      if (data.nextTierName) {
        const remaining = (data.nextTierMinSpend && data.totalSpent)
          ? Math.ceil(data.nextTierMinSpend - data.totalSpent)
          : 0
        notifHeader = 'Spesa registrata!'
        notifBody = `Livello ${data.currentTier || 'Base'}. Spendi ancora EUR ${remaining} per raggiungere ${data.nextTierName}`
      } else {
        notifHeader = 'Livello massimo!'
        notifBody = `Sei al livello massimo: ${data.currentTier || 'Base'} con sconto -${tierDiscount}%`
      }
      break
    }
    case 'subscription': {
      const isActive = data.subscriptionStatus === 'active'
      if (isActive) {
        notifHeader = 'Abbonamento attivo'
        notifBody = `Utilizzi oggi: ${data.dailyUses || 0} / ${data.dailyLimit || 1}`
      } else {
        notifHeader = 'Abbonamento scaduto'
        notifBody = 'Il tuo abbonamento e scaduto. Rinnova per continuare'
      }
      break
    }
    default:
      notifHeader = 'Aggiornamento'
      notifBody = 'La tua carta e stata aggiornata.'
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}/addMessage`,
      method: 'POST',
      data: {
        message: {
          header: notifHeader,
          body: notifBody,
          id: `msg_${Date.now()}`,
          messageType: 'TEXT_AND_NOTIFY',
        },
      },
    })
    console.log('Notifica inviata:', notifHeader)
  } catch (msgError: any) {
    console.warn('addMessage warning:', msgError.message)
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
