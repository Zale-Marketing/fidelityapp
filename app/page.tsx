import Link from 'next/link'
import LeadForm from '@/components/LeadForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-600">FidelityApp</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Accedi
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700"
            >
              Inizia Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left: text */}
            <div className="flex-1">
              <span className="bg-indigo-50 text-indigo-600 text-sm font-medium px-3 py-1 rounded-full inline-block mb-4">
                Carta fedelta digitale
              </span>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Bar, ristoranti e negozi: la carta fedelta digitale per i tuoi clienti
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Crei il programma in 5 minuti. I clienti salvano la carta su Google Wallet. Il cassiere timbra con la fotocamera — nessuna app da scaricare.
              </p>
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 shadow-lg inline-block"
              >
                Inizia Gratis
              </Link>
              <p className="text-sm text-gray-500 mt-3">
                Fino a 5 programmi gratis. Nessuna carta di credito.
              </p>
            </div>

            {/* Right: CSS phone mockup */}
            <div className="flex-shrink-0 w-64 lg:w-72 mx-auto">
              <div className="rounded-3xl border-4 border-gray-800 shadow-2xl overflow-hidden bg-gray-800">
                {/* Speaker bar */}
                <div className="bg-gray-800 py-3 flex justify-center">
                  <div className="rounded-full bg-gray-600 w-16 h-1.5"></div>
                </div>

                {/* Screen content */}
                <div className="bg-gray-100 px-0 pb-0">
                  {/* Google Wallet card */}
                  <div className="bg-indigo-600 rounded-2xl mx-3 my-2 p-4">
                    <p className="text-white text-xs font-medium opacity-70">Google Wallet</p>
                    <p className="text-white font-bold text-lg mt-2">Bar Roma</p>
                    <p className="text-white text-sm opacity-80">Carta Fedelta - Bollini</p>

                    {/* Stamp circles */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {/* 5 filled */}
                      <div className="bg-white rounded-full w-6 h-6"></div>
                      <div className="bg-white rounded-full w-6 h-6"></div>
                      <div className="bg-white rounded-full w-6 h-6"></div>
                      <div className="bg-white rounded-full w-6 h-6"></div>
                      <div className="bg-white rounded-full w-6 h-6"></div>
                      {/* 5 empty */}
                      <div className="border-2 border-white/50 rounded-full w-6 h-6"></div>
                      <div className="border-2 border-white/50 rounded-full w-6 h-6"></div>
                      <div className="border-2 border-white/50 rounded-full w-6 h-6"></div>
                      <div className="border-2 border-white/50 rounded-full w-6 h-6"></div>
                      <div className="border-2 border-white/50 rounded-full w-6 h-6"></div>
                    </div>

                    <p className="text-white text-sm mt-2 font-semibold">5 / 10 bollini</p>
                    <p className="text-white text-xs opacity-70 mt-1">Ancora 5 per un caffe gratis</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-100 py-2 text-center">
                  <p className="text-xs text-gray-400">powered by FidelityApp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <div className="bg-gray-50 border-y border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">50+</p>
              <p className="text-sm text-gray-500 mt-1">attivita attive</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">1.000+</p>
              <p className="text-sm text-gray-500 mt-1">carte emesse</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">5</p>
              <p className="text-sm text-gray-500 mt-1">tipi di programma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Come funziona */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Come funziona</h2>
          <p className="text-gray-500 text-center mb-12 text-lg">Tre passi. Zero app. Zero attrito.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Crei il programma</h3>
              <p className="text-gray-600 leading-relaxed">
                Scegli il tipo (bollini, punti, cashback) e personalizzi i colori. Pronto in 5 minuti.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Il cliente scansiona il QR</h3>
              <p className="text-gray-600 leading-relaxed">
                Con la fotocamera del telefono, senza app da scaricare. Funziona su qualsiasi smartphone.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Google Wallet si aggiorna</h3>
              <p className="text-gray-600 leading-relaxed">
                La carta del cliente si aggiorna in tempo reale ad ogni visita.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contattaci / Lead Capture */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Vuoi saperne di più?</h2>
          <p className="text-gray-600 mb-10 max-w-xl mx-auto">
            Lascia i tuoi contatti e ti spieghiamo come FidelityApp può funzionare per la tua attività.
          </p>
          <LeadForm />
        </div>
      </section>

      {/* CTA finale */}
      <section className="bg-indigo-600 py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Inizia oggi, e gratis</h2>
        <p className="text-indigo-100 text-lg mb-8">Crea il tuo primo programma fedelta in 5 minuti.</p>
        <Link
          href="/register"
          className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 shadow-lg inline-block"
        >
          Inizia Gratis
        </Link>
        <p className="text-indigo-200 text-sm mt-4">Nessuna carta di credito richiesta.</p>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8 px-4 text-center">
        <p className="text-gray-400 text-sm inline">
          &copy; 2026 FidelityApp by Zale Marketing
        </p>
        <Link href="/login" className="text-gray-400 hover:text-white text-sm ml-4">
          Accedi
        </Link>
      </footer>
    </div>
  )
}
