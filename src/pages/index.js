import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Event Pass & QR Portal | Paavai Engineering College</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col items-center justify-center p-6 py-12">
        <div className="max-w-3xl w-full text-center space-y-10">
          
          {/* Header Branding */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-28 h-28 relative rounded-full overflow-hidden border-4 border-white shadow-xl bg-white p-1">
              <img 
                src="/logo.jpg" 
                alt="Paavai Engineering College Logo" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-orange-600 font-extrabold tracking-wider uppercase text-xs">
                Startup Interaction & Networking Event
              </h2>
              <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Paavai Engineering College <span className="text-orange-600 block md:inline">(Autonomous)</span>
              </h1>
              <p className="text-gray-600 text-base md:text-lg max-w-lg mx-auto">
                Official Event Pass Generation & Volunteer QR Entry Verification System
              </p>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
            
            {/* Card 1: Participant Pass Portal */}
            <Link
              href="/claim-pass"
              className="group relative flex flex-col items-center p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-orange-100/80 text-center"
            >
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 14a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">Claim / Download Pass</span>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                For pre-registered participants. Look up your record, take a selfie, and get your digital QR pass.
              </p>
              <span className="mt-5 inline-flex items-center text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
                Get Pass Now →
              </span>
            </Link>

            {/* Card 2: Volunteer Gate Scanner */}
            <Link
              href="/scan"
              className="group relative flex flex-col items-center p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-red-100/80 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">Volunteer Gate Scanner</span>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                For event coordinators & gate volunteers to scan QR passes and record attendance in real time.
              </p>
              <span className="mt-5 inline-flex items-center text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                Open Scanner →
              </span>
            </Link>

          </div>

          <footer className="pt-8 text-gray-400 text-xs">
            © {new Date().getFullYear()} Paavai Engineering College. All rights reserved.
          </footer>
        </div>
      </main>
    </>
  );
}