import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function ClaimPass() {
  const router = useRouter();

  // Multi-step state: 1 = Search, 2 = Verify & Photo, 3 = Issuing/Complete
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Found Participant details
  const [participant, setParticipant] = useState(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  // Camera & Photo State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stop video stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const startCamera = async (overrideFacing) => {
    stopCamera();
    const mode = overrideFacing || facingMode;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Camera access denied or unavailable. You can upload a photo file below.");
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  // Helper to compress image to 180x180 thumbnail (<25KB base64 string) for Google Sheets compatibility
  const compressAndSetPhoto = (imageElement, videoWidth, videoHeight) => {
    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const targetSize = 180;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const srcWidth = videoWidth || imageElement.width || 300;
    const srcHeight = videoHeight || imageElement.height || 300;
    const size = Math.min(srcWidth, srcHeight);
    const startX = (srcWidth - size) / 2;
    const startY = (srcHeight - size) / 2;

    ctx.clearRect(0, 0, targetSize, targetSize);

    if (facingMode === "user" && videoWidth) {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(imageElement, startX, startY, size, size, 0, 0, targetSize, targetSize);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    setCapturedPhoto(dataUrl);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    compressAndSetPhoto(video, video.videoWidth, video.videoHeight);
    stopCamera();
    toast.success("Selfie captured successfully!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size should be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        compressAndSetPhoto(img);
        stopCamera();
        toast.success("Photo uploaded successfully!");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter your email, mobile number, or name.");
      return;
    }

    setIsSearching(true);
    const loadingToast = toast.loading("Searching pre-registration records...");

    try {
      const res = await axios.post("/api/lookupParticipant", { query: searchQuery });
      setParticipant(res.data);
      toast.success("Participant found!", { id: loadingToast });
      setStep(2);

      // Auto start camera if pass not issued or photo missing
      if (!res.data.isPassIssued || !res.data.photoUrl) {
        setShowPhotoCapture(true);
        setTimeout(() => startCamera("user"), 300);
      }
    } catch (err) {
      console.error("==================================================");
      console.error("❌ PARTICIPANT LOOKUP FAILURE (/api/lookupParticipant)");
      console.error("Search Query:", searchQuery);
      console.error("HTTP Status Code:", err.response?.status || "Network/Server Error");
      console.error("Error Message:", err.response?.data?.message || err.message);
      if (err.response?.data) {
        console.error("Server Error Payload:", err.response.data);
      }
      console.error("Troubleshooting Checklist:");
      console.error("1. Ensure SPREADSHEET_ID is set in your .env file.");
      console.error("2. Ensure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are valid.");
      console.error("3. Ensure your Google Sheet is shared with your service account email.");
      console.error("==================================================");

      const errorMsg = err.response?.data?.message || "Lookup failed. Please check your credentials or query.";
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClaimPass = async () => {
    if (!capturedPhoto && !participant?.photoUrl) {
      toast.error("Please take a selfie or upload a photo file first.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Generating your pass & updating record...");

    try {
      const res = await axios.post("/api/claimPass", {
        query: searchQuery,
        rowIndex: participant?.rowIndex,
        photo: capturedPhoto || participant?.photoUrl,
      });

      toast.success("Pass issued successfully!", { id: loadingToast });
      router.push(`/pass/${res.data.uniqueId}`);
    } catch (err) {
      console.error("==================================================");
      console.error("❌ PASS CLAIM GENERATION FAILURE (/api/claimPass)");
      console.error("Participant:", participant?.name, "| Query:", searchQuery);
      console.error("HTTP Status Code:", err.response?.status || "Network/Server Error");
      console.error("Error Message:", err.response?.data?.message || err.message);
      if (err.response?.data) {
        console.error("Server Error Payload:", err.response.data);
      }
      console.error("Troubleshooting Checklist:");
      console.error("1. Check that SPREADSHEET_ID is defined in .env file.");
      console.error("2. Check that the Service Account has Editor permissions on the Google Sheet.");
      console.error("==================================================");

      const errorMsg = err.response?.data?.message || "Failed to generate pass. Please try again.";
      toast.error(errorMsg, { id: loadingToast });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Claim Event Pass | Paavai Engineering College</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-10 px-4 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-orange-100/60">

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center p-1 shadow-lg border-2 border-white/40">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Participant Pass Portal</h1>
            <p className="text-orange-100 text-sm mt-1">Startup Interaction & Networking Event</p>

            {/* Stepper indicator */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 1 ? "bg-white text-orange-600" : "bg-orange-400/50 text-white"}`}>
                1
              </div>
              <div className={`h-1 w-12 rounded ${step >= 2 ? "bg-white" : "bg-orange-400/40"}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 2 ? "bg-white text-orange-600" : "bg-orange-400/50 text-white"}`}>
                2
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* STEP 1: Search Form */}
            {step === 1 && (
              <form onSubmit={handleSearch} className="space-y-6 animate-in fade-in duration-300">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">Look Up Your Registration</h2>
                  <p className="text-gray-500 text-sm">
                    Enter the email address, 10-digit mobile number, or full name you used when filling out the Google Form.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Email / Mobile Number / Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 p-4 rounded-2xl outline-none text-gray-900 font-medium transition-all text-base"
                    placeholder="e.g. ragulb28112005@gmail.com or 9043408788"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 text-lg flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching Record...
                    </>
                  ) : (
                    "Find My Record"
                  )}
                </button>

                <div className="pt-4 text-center">
                  <Link href="/" className="text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors">
                    ← Back to Dashboard
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 2: Verification & Photo Capture */}
            {step === 2 && participant && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Found Participant Card */}
                <div className="bg-orange-50/60 border border-orange-200/70 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600">Pre-Registration Match</span>
                    <span className="px-3 py-1 bg-orange-200/60 text-orange-800 text-xs font-bold rounded-full">{participant.category}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900">{participant.name}</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong className="text-gray-700">Institution:</strong> {participant.institution}</p>
                    {participant.department && <p><strong className="text-gray-700">Department:</strong> {participant.department}</p>}
                    {participant.yearOfStudy && <p><strong className="text-gray-700">Year:</strong> {participant.yearOfStudy}</p>}
                    {participant.email && <p><strong className="text-gray-700">Email:</strong> {participant.email}</p>}
                  </div>
                </div>

                {/* If Pass is Already Issued AND User didn't click update photo */}
                {participant.isPassIssued && !showPhotoCapture ? (
                  <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Pass Already Issued!</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Your event pass is ready. Unique ID: <span className="font-mono font-bold text-orange-600">{participant.uniqueId}</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href={`/pass/${participant.uniqueId}`}
                        className="block w-full bg-orange-600 text-white font-bold py-3.5 rounded-xl hover:bg-orange-700 transition-all shadow-lg text-center"
                      >
                        View & Download My Pass
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPhotoCapture(true);
                          setTimeout(() => startCamera("user"), 300);
                        }}
                        className="w-full text-xs font-semibold text-orange-600 hover:underline py-2"
                      >
                        📷 Take Live Selfie / Update Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Pass Photo Capture Section */
                  <div className="space-y-5">
                    <div className="text-center">
                      <h3 className="text-lg font-extrabold text-gray-900">Take Live Selfie or Upload Photo</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Your photo will be printed on your official digital pass card.</p>
                    </div>

                    {/* Camera Video / Captured Image Frame */}
                    <div className="relative w-full max-w-[320px] aspect-square mx-auto rounded-3xl overflow-hidden border-4 border-orange-500 shadow-xl bg-black flex items-center justify-center">
                      {capturedPhoto ? (
                        <img src={capturedPhoto} alt="Selfie Preview" className="w-full h-full object-cover" />
                      ) : (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                        />
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>

                    {/* Camera Action Buttons */}
                    <div className="flex flex-col items-center gap-3">
                      {!capturedPhoto ? (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all"
                          >
                            {isCameraActive ? "🔄 Restart Camera" : "📷 Open Camera"}
                          </button>
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all"
                          >
                            🔁 Flip Camera
                          </button>
                          <button
                            type="button"
                            onClick={takeSnapshot}
                            disabled={!isCameraActive}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            📸 Take Snapshot
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedPhoto(null);
                            startCamera();
                          }}
                          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          🔄 Retake Photo
                        </button>
                      )}

                      {/* File Upload Option */}
                      <div className="pt-2 text-center">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-orange-600 font-bold hover:underline bg-orange-50 px-4 py-2 rounded-xl border border-orange-200">
                          📁 Or Upload Photo File From Device
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>

                    {/* Submit Pass Claim Button */}
                    <button
                      type="button"
                      onClick={handleClaimPass}
                      disabled={isSubmitting || (!capturedPhoto && !participant.photoUrl)}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50 text-lg flex items-center justify-center gap-2 mt-4"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Generating Your Pass...
                        </>
                      ) : (
                        "Generate & Download Event Pass"
                      )}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setStep(1);
                      setShowPhotoCapture(false);
                      setCapturedPhoto(null);
                    }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    ← Search Another Record
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
