import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import axios from 'axios';

export default function DigitalPass() {
  const router = useRouter();
  const { id } = router.query;

  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchParticipant = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/getParticipant?id=${id}`);
        setParticipant(response.data);
        setError(null);
      } catch (err) {
        console.error("==================================================");
        console.error("❌ DIGITAL PASS FETCH FAILURE (/api/getParticipant)");
        console.error("Pass ID:", id);
        console.error("HTTP Status Code:", err.response?.status || "Network/Server Error");
        console.error("Error Message:", err.response?.data?.message || err.message);
        if (err.response?.data) {
          console.error("Server Error Payload:", err.response.data);
        }
        console.error("Troubleshooting Checklist:");
        console.error("1. Ensure SPREADSHEET_ID is defined in your .env file.");
        console.error("2. Verify that the Unique Pass ID exists in your Google Sheet (Column J).");
        console.error("==================================================");

        setError(err.response?.data?.message || `Pass ID "${id}" could not be loaded.`);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipant();
  }, [id]);

  const shareToWhatsApp = () => {
    const url = window.location.href;
    const text = `Hi! Here is my official event pass for the Startup Interaction & Event. Unique ID: ${id}\n\nView it here: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const downloadQR = () => {
    const svg = document.getElementById("QRCode");
    if (!svg) return;

    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute("width", "256");
    svgClone.setAttribute("height", "256");

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const qrSrc = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));

    const loadImage = (src, isCrossOrigin = false) => {
      return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        if (isCrossOrigin && !src.startsWith("data:image/")) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = (err) => {
          console.warn("Canvas image load fallback:", err);
          resolve(null);
        };
        img.src = src;
      });
    };

    const drawRoundRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const photoSrc = participant?.photoUrl
      ? participant.photoUrl.startsWith("data:image/")
        ? participant.photoUrl
        : `/api/photo?url=${encodeURIComponent(participant.photoUrl)}`
      : null;

    const imagePromises = [
      loadImage("/logo.jpg", false),
      loadImage(qrSrc, false),
      photoSrc ? loadImage(photoSrc, !photoSrc.startsWith("data:image/")) : Promise.resolve(null),
    ];

    Promise.all(imagePromises).then(([logoImg, qrImg, photoImg]) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = 600;
      canvas.height = 1050;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Background Card
      ctx.save();
      ctx.fillStyle = "#ffffff";
      drawRoundRect(ctx, 0, 0, 600, 1050, 32);
      ctx.fill();
      ctx.clip();

      // Header Banner
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(0, 0, 600, 260);

      // Logo Arc
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(300, 85, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(300, 85, 45, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, 255, 40, 90, 90);
        ctx.restore();
      }

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
      ctx.fillText("Official Event Pass", 300, 168);

      ctx.fillStyle = "#ffedd5";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      ctx.fillText("PAAVAI ENGINEERING COLLEGE", 300, 205);

      ctx.restore();

      // Participant Photo Circle
      ctx.save();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(300, 350, 60, 0, Math.PI * 2);
      ctx.stroke();

      if (photoImg) {
        ctx.beginPath();
        ctx.arc(300, 350, 58, 0, Math.PI * 2);
        ctx.clip();

        const size = 116;
        const x = 300 - 58;
        const y = 350 - 58;
        const imgRatio = photoImg.width / photoImg.height;
        let sWidth = photoImg.width;
        let sHeight = photoImg.height;
        let sx = 0;
        let sy = 0;

        if (imgRatio > 1) {
          sWidth = photoImg.height;
          sx = (photoImg.width - sWidth) / 2;
        } else {
          sHeight = photoImg.width;
          sy = (photoImg.height - sHeight) / 2;
        }

        ctx.drawImage(photoImg, sx, sy, sWidth, sHeight, x, y, size, size);
      } else {
        ctx.fillStyle = "#f3f4f6";
        ctx.beginPath();
        ctx.arc(300, 350, 58, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#9ca3af";
        ctx.beginPath();
        ctx.arc(300, 335, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(300, 395, 40, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();

      // Participant Name
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.fillText(participant?.name || "Participant Name", 300, 440);

      // Category & Institution
      ctx.fillStyle = "#ea580c";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      const metaText = [participant?.category, participant?.department || participant?.institution]
        .filter(Boolean)
        .join(" • ");
      ctx.fillText(metaText.toUpperCase(), 300, 470);

      // QR Code Container Box
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#fff7ed";
      ctx.lineWidth = 4;
      drawRoundRect(ctx, 175, 510, 250, 250, 20);
      ctx.fill();
      ctx.stroke();

      if (qrImg) {
        ctx.drawImage(qrImg, 190, 525, 220, 220);
      }

      // Unique Entry ID Block
      ctx.fillStyle = "#9ca3af";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText("UNIQUE ENTRY ID", 300, 800);

      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#f3f4f6";
      ctx.lineWidth = 2;
      drawRoundRect(ctx, 100, 825, 400, 60, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 22px monospace";
      ctx.fillText(id, 300, 855);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText("Please present this QR code at the entry gate for verification.", 300, 935);
      ctx.fillText(`© ${new Date().getFullYear()} Paavai Engineering College`, 300, 975);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `PEC-Pass-${id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    });
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 space-y-3">
      <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-orange-600 font-medium text-base">Loading your digital pass...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100 space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Invalid Entry Pass</h2>
        <p className="text-gray-500 text-sm">{error}</p>
        <Link href="/claim-pass" className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-700 transition-all">
          Claim Your Pass Here
        </Link>
      </div>
    </div>
  );

  const displayPhotoUrl = participant?.photoUrl
    ? participant.photoUrl.startsWith("data:image/")
      ? participant.photoUrl
      : `/api/photo?url=${encodeURIComponent(participant.photoUrl)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-gray-100 to-red-50 flex flex-col items-center justify-center p-4 py-8">
      <Head>
        <title>Your Official Event Pass | Paavai Engineering College</title>
      </Head>

      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-md">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold">Official Event Pass</h1>
          <p className="text-orange-100 text-xs uppercase tracking-widest font-semibold mt-0.5">Paavai Engineering College</p>
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          {/* Participant Photo & Details */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full overflow-hidden border-4 border-orange-500 shadow-md mb-3 flex items-center justify-center">
              {displayPhotoUrl && !imageError ? (
                <img
                  src={displayPhotoUrl}
                  alt={participant.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900">{participant?.name || "Participant"}</h2>

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
              {participant?.category && (
                <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                  {participant.category}
                </span>
              )}
            </div>

            {participant?.institution && (
              <p className="text-xs text-gray-500 font-medium mt-1 max-w-[260px]">{participant.institution}</p>
            )}

            {participant?.department && (
              <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-0.5">{participant.department}</p>
            )}
          </div>

          <div className="p-4 bg-white border-2 border-orange-100 rounded-2xl mb-6 shadow-inner">
            <QRCode
              id="QRCode"
              value={id}
              size={200}
              level="H"
              className="mx-auto"
            />
          </div>

          <div className="mb-8 w-full">
            <p className="text-gray-400 text-xs uppercase font-bold mb-1 tracking-wider">Unique Entry ID</p>
            <p className="text-2xl font-mono font-bold text-orange-600 bg-orange-50/60 px-4 py-2.5 rounded-xl border border-orange-200/60">
              {id}
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={downloadQR}
              className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 text-base"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Official Pass (PNG)
            </button>

            <button
              onClick={shareToWhatsApp}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 text-base"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.171c1.589.943 3.503 1.441 5.451 1.442 5.454 0 9.895-4.442 9.898-9.896.002-2.646-1.03-5.132-2.905-7.008-1.875-1.875-4.361-2.903-7.006-2.903-5.459 0-9.896 4.442-9.899 9.897-.001 2.123.543 4.191 1.574 5.997l-.998 3.648 3.735-.98z" />
              </svg>
              Share via WhatsApp
            </button>
          </div>

          <p className="mt-6 text-gray-400 text-[10px] leading-relaxed">
            Please present this QR code at the event venue entry gate for verification.
          </p>
        </div>
      </div>

      <footer className="mt-8 text-gray-400 text-xs flex flex-col items-center gap-2">
        <p>© {new Date().getFullYear()} Paavai Engineering College. All rights reserved.</p>
      </footer>
    </div>
  );
}