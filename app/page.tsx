import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-white">FidelityApp</h1>
        <div className="space-x-4">
          <Link 
            href="/login" 
            className="text-white hover:text-gray-200"
          >
            Accedi
          </Link>
          <Link 
            href="/register" 
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100"
          >
            Registrati
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <h2 className="text-5xl font-bold text-white mb-6">
          Fidelity Card Digitali
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl">
          Crea programmi fedeltà per i tuoi clienti. 
          Carte su Google e Apple Wallet. 
          Timbri con QR code.
        </p>
        <Link 
          href="/register"
          className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-xl font-bold hover:bg-gray-100 shadow-lg"
        >
          Inizia Gratis →
        </Link>
        <p className="text-white/70 mt-4">
          Fino a 5 programmi gratis. Nessuna carta di credito.
        </p>
      </main>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 px-6 py-16 max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-xl font-bold mb-2">Wallet Digitale</h3>
          <p className="text-white/80">I clienti salvano la card su Apple o Google Wallet</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">📷</div>
          <h3 className="text-xl font-bold mb-2">Scansione QR</h3>
          <p className="text-white/80">Timbra con la fotocamera. Veloce e senza errori</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">Dashboard</h3>
          <p className="text-white/80">Monitora clienti, timbri e premi in tempo reale</p>
        </div>
      </section>
    </div>
  )
}