import React, { useState, useRef, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function Scan() {
  const router = useRouter();

  // Volunteer Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Scan & Modal State
  const [scannedCode, setScannedCode] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, submitting, success, error
  const [participantData, setParticipantData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const qrRef = useRef(null);

  // Check volunteer session on mount
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem("isVolunteerLoggedIn");
    const roleAuth = sessionStorage.getItem("isLoggedIn");
    if (sessionAuth === "true" || roleAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleVolunteerLogin = (e) => {
    e.preventDefault();
    if (
      authUsername.trim().toLowerCase() === "paavai" &&
      authPassword.trim() === "Pec@123"
    ) {
      sessionStorage.setItem("isVolunteerLoggedIn", "true");
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("role", "volunteer");
      setIsAuthenticated(true);
      toast.success("Volunteer Access Verified! Scanner active.");
    } else {
      toast.error("Invalid Username or Password!");
    }
  };

  const handleVolunteerLogout = () => {
    sessionStorage.removeItem("isVolunteerLoggedIn");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("role");
    setIsAuthenticated(false);
    setAuthUsername("");
    setAuthPassword("");
    toast.success("Volunteer session locked.");
  };

  const handleScan = (result, error) => {
    if (!!result && status === "idle" && !showModal && isAuthenticated) {
      const text = result?.text || "";
      if (text) {
        setScannedCode(text);
        setShowModal(true);
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStatus("idle");
    setScannedCode("");
    setParticipantData(null);
    setErrorMessage("");
  };

  const handleConfirmCheckIn = async () => {
    setStatus("submitting");
    const loadingToast = toast.loading("Verifying event pass...");

    try {
      const response = await axios.post("/api/postData", {
        data: scannedCode,
      });

      toast.success(response.data.message || "Check-in approved!", { id: loadingToast });
      setParticipantData(response.data);
      setStatus("success");
    } catch (err) {
      console.error("==================================================");
      console.error("❌ VOLUNTEER GATE SCAN FAILURE (/api/postData)");
      console.error("Scanned Code:", scannedCode);
      console.error("HTTP Status Code:", err.response?.status || "Network/Server Error");
      console.error("Error Message:", err.response?.data?.message || err.message);
      if (err.response?.data) {
        console.error("Server Error Payload:", err.response.data);
      }
      console.error("Troubleshooting Checklist:");
      console.error("1. Ensure SPREADSHEET_ID is set in your .env file.");
      console.error("2. Verify that the scanned pass ID exists in Google Sheet Column J.");
      console.error("3. Ensure the Service Account has Editor rights on the Google Sheet.");
      console.error("==================================================");

      const msg = err.response?.data?.message || "Failed to verify ticket.";
      setErrorMessage(msg);
      toast.error(msg, { id: loadingToast });
      setStatus("error");
      if (err.response?.data) {
        setParticipantData(err.response.data);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Volunteer Gate Scanner | Paavai Engineering College</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-between p-4 py-8 relative">
        {/* Header */}
        <div className="w-full max-w-md flex flex-col items-center text-center space-y-2 relative">
          {isAuthenticated && (
            <button
              onClick={handleVolunteerLogout}
              className="absolute top-0 right-0 px-3 py-1 bg-red-600/30 hover:bg-red-600 text-red-200 border border-red-500/50 rounded-full text-xs font-semibold transition-all"
            >
              🔒 Lock
            </button>
          )}

          <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg border-2 border-orange-500 overflow-hidden">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Volunteer Gate Scanner</h1>
          <p className="text-gray-400 text-xs">Align participant&apos;s Pass QR code inside frame</p>
        </div>

        {/* QR Scanner Frame */}
        <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden border-4 border-orange-500/80 shadow-2xl shadow-orange-500/10 bg-black my-6">
          {isAuthenticated && status === "idle" && (
            <QrReader
              onResult={handleScan}
              constraints={{ facingMode: "environment" }}
              className="w-full h-full object-cover"
              ref={qrRef}
            />
          )}

          {!isAuthenticated && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-900/90 text-gray-400">
              <svg className="w-12 h-12 mb-3 text-orange-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-sm font-semibold text-white">Scanner Locked</p>
              <p className="text-xs text-gray-500 mt-1">Please enter volunteer credentials to unlock scanning.</p>
            </div>
          )}

          {/* Scanner Overlay Animation */}
          {isAuthenticated && (
            <div className="absolute inset-0 border-2 border-orange-500/50 pointer-events-none rounded-3xl flex items-center justify-center">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_#f97316] animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl text-xs text-gray-400">
            💡 Tap &quot;Confirm&quot; after scanning to record attendance in Google Sheets.
          </div>

          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors"
          >
            ← Return to Main Portal
          </Link>
        </div>

        {/* VOLUNTEER LOGIN VERIFICATION DIALOG MODAL */}
        {!isAuthenticated && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white text-gray-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto text-orange-600 shadow-md">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900">Volunteer Access</h3>
                <p className="text-xs text-gray-500">Enter verification credentials to unlock gate scanner.</p>
              </div>

              <form onSubmit={handleVolunteerLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Username (e.g. Paavai)"
                    className="w-full border-2 border-gray-200 focus:border-orange-500 focus:ring-0 p-3.5 rounded-xl text-sm font-medium outline-none transition-all"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full border-2 border-gray-200 focus:border-orange-500 focus:ring-0 p-3.5 rounded-xl text-sm font-medium outline-none transition-all"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 text-base mt-2"
                >
                  Verify Access & Unlock
                </button>
              </form>

              <div className="text-center pt-2">
                <Link href="/" className="text-xs font-semibold text-gray-400 hover:text-gray-700">
                  ← Back to Homepage
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation & Result Modal */}
        {isAuthenticated && showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
            <div className="bg-white text-gray-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
              
              {/* SUCCESS MODAL STATE */}
              {status === "success" && participantData && (
                <div className="p-6 text-center space-y-5">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-md">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  {/* Photo & Name */}
                  <div className="flex flex-col items-center space-y-2">
                    {participantData.photoUrl && (
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-orange-500 shadow-lg mb-1">
                        <img
                          src={
                            participantData.photoUrl.startsWith("data:image/")
                              ? participantData.photoUrl
                              : `/api/photo?url=${encodeURIComponent(participantData.photoUrl)}`
                          }
                          alt={participantData.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <h3 className="text-2xl font-extrabold text-gray-900">{participantData.name}</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-wider">
                      Verified Entry
                    </span>
                  </div>

                  {/* Institution & Details */}
                  <div className="bg-gray-50 p-4 rounded-2xl text-left text-xs space-y-1.5 border border-gray-100">
                    <p><strong className="text-gray-700">Institution:</strong> {participantData.institution}</p>
                    {participantData.category && <p><strong className="text-gray-700">Category:</strong> {participantData.category}</p>}
                    {participantData.department && <p><strong className="text-gray-700">Department:</strong> {participantData.department}</p>}
                  </div>

                  <button
                    className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-lg text-sm"
                    onClick={handleCloseModal}
                  >
                    Scan Next Participant
                  </button>
                </div>
              )}

              {/* ERROR MODAL STATE */}
              {status === "error" && (
                <div className="p-6 text-center space-y-5">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-md">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>

                  {participantData?.name && (
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900">{participantData.name}</h3>
                    </div>
                  )}

                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-semibold border border-red-100">
                    {errorMessage}
                  </div>

                  <button
                    className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-lg text-sm"
                    onClick={handleCloseModal}
                  >
                    Close & Try Again
                  </button>
                </div>
              )}

              {/* CONFIRMATION / INITIAL MODAL STATE */}
              {(status === "idle" || status === "submitting") && (
                <div className="p-6 text-center space-y-5">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600 shadow-md">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">Confirm Gate Entry</h3>
                    <p className="text-xs text-gray-500 mt-1">Scanned Pass Identifier:</p>
                  </div>

                  <div className="bg-gray-100 p-3 rounded-xl font-mono text-sm text-gray-800 font-bold break-all">
                    {scannedCode}
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
                      onClick={handleCloseModal}
                      disabled={status === "submitting"}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                      onClick={handleConfirmCheckIn}
                      disabled={status === "submitting"}
                    >
                      {status === "submitting" ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        "Confirm Check-in"
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>
    </>
  );
}