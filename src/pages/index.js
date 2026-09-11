import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Event Pass Portal | Paavai Engineering College</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col items-center justify-center p-6 py-12">
        <div className="max-w-2xl w-full text-center space-y-10">
          
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
                Official Self-Service Digital Event Pass Generator
              </p>
            </div>
          </div>

          {/* Single Participant Card: Claim / Download Pass */}
          <div className="max-w-md mx-auto pt-2">
            <Link
              href="/claim-pass"
              className="group relative flex flex-col items-center p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-orange-100 text-center"
            >
              <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all text-orange-600 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 14a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <span className="text-2xl font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors">Claim / Download Pass</span>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                For pre-registered participants. Enter your email address or 10-digit mobile number, take a selfie, and download your official QR pass.
              </p>
              <span className="mt-6 w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-2xl shadow-lg group-hover:from-orange-700 group-hover:to-red-700 transition-all text-base">
                Get Pass Now →
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