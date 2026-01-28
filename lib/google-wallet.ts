import jwt from 'jsonwebtoken'

// Configurazione da variabili d'ambiente
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID!
const CLIENT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL!
const PRIVATE_KEY = Buffer.from(process.env.GOOGLE_WALLET_PRIVATE_KEY_BASE64!, 'base64').toString('utf-8')

// URL base dell'app (cambierà quando vai su Vercel)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Funzione per pulire gli ID (rimuove caratteri non validi)
function sanitizeId(id: string): string {
  return id.replace(/-/g, '').substring(0, 32)
}

// Genera il link "Add to Google Wallet"
export async function generateWalletLink(
  programId: string,
  cardId: string,
  scanToken: string,
  stampCount: number,
  stampsRequired: number,
  programName: string,
  issuerName: string,
  backgroundColor: string = '#6366f1',
  logoUrl?: string
): Promise<string> {
  
  const cleanProgramId = sanitizeId(programId)
  const cleanCardId = sanitizeId(cardId)
  
  const classId = `${ISSUER_ID}.${cleanProgramId}`
  const objectId = `${ISSUER_ID}.${cleanCardId}`

  // URL dell'immagine dei bollini (generata dinamicamente)
  const stampsImageUrl = `${APP_URL}/api/stamps-image?stamps=${stampCount}&total=${stampsRequired}&color=${encodeURIComponent(backgroundColor)}${logoUrl ? `&logo=${encodeURIComponent(logoUrl)}` : ''}`

  // Definisci la classe (programma fidelity)
  const loyaltyClass = {
    id: classId,
    issuerName: issuerName,
    programName: programName,
    programLogo: {
      sourceUri: {
        uri: logoUrl || 'https://www.gstatic.com/images/branding/product/2x/google_cloud_64dp.png'
      }
    },
    heroImage: {
      sourceUri: {
        uri: stampsImageUrl
      }
    },
    hexBackgroundColor: backgroundColor,
    reviewStatus: 'UNDER_REVIEW',
  }

  // Definisci l'oggetto (card cliente)
  const loyaltyObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    accountId: cleanCardId.substring(0, 12),
    accountName: 'Cliente',
    loyaltyPoints: {
      label: 'Timbri',
      balance: { int: stampCount },
    },
    barcode: {
      type: 'QR_CODE',
      value: scanToken,
      alternateText: scanToken.substring(0, 12),
    },
    heroImage: {
      sourceUri: {
        uri: stampsImageUrl
      }
    },
  }

  // Crea il JWT
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

// Aggiorna i punti nel Wallet (chiamata quando si timbra)
export async function updateWalletCard(
  cardId: string,
  stampCount: number,
  stampsRequired: number,
  backgroundColor: string = '#6366f1',
  logoUrl?: string
): Promise<void> {
  const { GoogleAuth } = await import('google-auth-library')
  
  const cleanCardId = sanitizeId(cardId)
  const objectId = `${ISSUER_ID}.${cleanCardId}`

  // URL dell'immagine dei bollini aggiornata
  const stampsImageUrl = `${APP_URL}/api/stamps-image?stamps=${stampCount}&total=${stampsRequired}&color=${encodeURIComponent(backgroundColor)}${logoUrl ? `&logo=${encodeURIComponent(logoUrl)}` : ''}&t=${Date.now()}`

  const auth = new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
  })

  const client = await auth.getClient()
  
  const updateData = {
    loyaltyPoints: {
      label: 'Timbri',
      balance: { int: stampCount },
    },
    heroImage: {
      sourceUri: {
        uri: stampsImageUrl
      }
    },
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId}`,
      method: 'PATCH',
      data: updateData,
    })
    console.log('✅ Wallet aggiornato:', stampCount, 'timbri')
  } catch (error: any) {
    // Se l'oggetto non esiste nel wallet, ignora
    console.log('⚠️ Wallet non aggiornato (card non nel wallet?):', error.message)
  }
}