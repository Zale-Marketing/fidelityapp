const jwt = require('jsonwebtoken');

const ISSUER_ID = '3388000000023061237';
const CLIENT_EMAIL = 'fidelity-wallet@fidelityapp-485713.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIkOQLf6ozVMwz
QDMlVF3ET1SdtrocE0TZr+STnK4nYZcUQjeTe1uBW8Bq4zD/Q60176Rbbb3PqeBG
DDSxX7iqpEROgMveQseirG3Gv0khgo8dz2a2x/Eiwh9G7pDSF6AfEC7qY7gFjpr+
Bi43iD4zrlC8GoDELYVrP82rxEcqSTT52RYhkhMers/aKBforF7aHQUoabNClUIi
vRuEfd2kms9F7TQ0Dv1YvWdbQfQOXceEfJKEaqPSlZw5dcnTisxxhlVfoiMApms0
gkQS4rjTSNqreaDUi1sEeMimPebjI51V6INTRl5schi/mNAR5VKYr4nOQEhZnWsi
jGunornRAgMBAAECggEAMUnWGPNPNt0kb4Xb69UPVAJw129Dzkl39o0wvYvYCoqD
j7F0KfS7OI99OmdJr7mIdARH3kYaStHC8UPnoR1Wau0Cck5Zi23a1KHOOnTgunD0
zc0dv1ZkbnfJKuvOwCqZKXkXJnfKDeeNNFb9fZ0oOBgi9A8JTOyo6IHd/9O073Fs
+3VEpt+a26lQwSlSuC4slE+TXUcYe2oE3kXERs5q/bmJ7fyM+RYZmhoDx/Ki08r5
hl3sKSiyuH54FssyRLEQcihfzSWTBcHfGoSYJzIS9TzInOOP1wXa+NWucQ5lEc1u
oJsEtamuyNNmo9C440eW1cnkmMcvPe5U9nr8wG2TtwKBgQD/jPaDCLRXuYDE2NWx
Q1teUZbvI4hR7NXwQ23ZY18yRLjhHbu6ZIs1+Ujlf6ocD7kwi9KzuArq7BIM9myO
j5UW2KhnuApANdRYbcQpVaov1oPUTqmH4JAFQLbyszohdwJrzMpK3tKpJL/YsWY+
44vfuM/K5cPx9iA4VpwHx9YJVwKBgQDI6y0jHweGVTXbWANVDLtys2QBAgkpaFY1
V//oo2bSKBL04VlFI8QckWFKtcOPH9PJE1QdhPufzIOpX5xvlhXAe1gtzKOXC+Gc
9HpVJDPBk8cuWBrpmZUtPKM9tZUZUm9gB0in2nwkMEmk/pMilxldjZS67n9fhMGr
LITdCWJVFwKBgBQ30dUCHkqGeaKZSSbSHmty5w8ab5GTvEVbAFjfnMt8VmgxEwYn
KEBn7ZWCqTG5KLyng08Gs45siO0Pnf0VbQU2tPQnwl/cImWwoYFnrqREQ3/LjWwb
nylbOl4vQd0d7kobFLIhuOb66la5ik5VcF6N35q83OjKwTfT2lpfPBbXAoGAXdLU
xS3cSbLI76DuDW1gq3NyI7ZbqOZ8O3TYoD6N6V2lXI1PLqZBEkYhdM3kgJWQRLmt
8gsDpd/PK+zmFIW1qqjuyJRjYEnAFZdk+RVqxd7IiK/EAYoiy3khkdOVyLliISnF
l/zDM/MIsO/grap5weI3rgNpn6VS+yhS8xVKwgkCgYEAo+ZLL2F19d29j5Phb6v0
TzB/3YykXPuhB9E66ru00gI0fxtNLZztsPK/+P3Lw12TPSEIatmr6rVWZaGwz2UR
o7kupzg6idxNFMBAU1Tcz+HU0E+oycpldZ8JIUBdX3BSVhBnUllhmLjlMcgFUGti
3ZaUK49uV3PDIxbvlmbY8MU=
-----END PRIVATE KEY-----`;

// Usa la classe già creata
const classId = `${ISSUER_ID}.testclass002`;
const objectId = `${ISSUER_ID}.testobject003`;

// Solo l'oggetto (la classe esiste già)
const loyaltyObject = {
  id: objectId,
  classId: classId,
  state: 'ACTIVE',
  accountId: 'cliente001',
  accountName: 'Cliente Test',
  loyaltyPoints: {
    label: 'Timbri',
    balance: { int: 2 }
  },
  barcode: {
    type: 'QR_CODE',
    value: 'test123456',
    alternateText: 'test123456'
  }
};

const claims = {
  iss: CLIENT_EMAIL,
  aud: 'google',
  typ: 'savetowallet',
  iat: Math.floor(Date.now() / 1000),
  payload: {
    loyaltyObjects: [loyaltyObject]
  }
};

const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: 'RS256' });

console.log('\n=== LINK GOOGLE WALLET ===\n');
console.log(`https://pay.google.com/gp/v/save/${token}`);
console.log('\n=== APRI QUESTO LINK NEL BROWSER ===\n');