import { getGoogleSheetsClient, resolveColumnIndices, getColumnLetter } from "@/utils/sheetHelpers";
import { sendSmartEmail } from "@/utils/mailer";

export default async function handler(req, res) {
  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    // Fetch range A:P
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:P",
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.status(200).json({
        success: true,
        stats: { total: 0, sent: 0, pending: 0 },
        message: "No participant rows found in Google Sheet.",
      });
    }

    const headers = rows[0];
    const cols = resolveColumnIndices(headers);

    // Parse participants
    const participants = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const email = (row[cols.email] || "").trim();
      const fullName = (row[cols.fullName] || "Participant").trim();
      const uniqueId = (row[cols.uniqueId] || "").trim();
      const invitationSent = (row[cols.invitationSent] || "").trim().toUpperCase();

      if (email) {
        participants.push({
          rowIndex: i + 1, // 1-based index in Sheet
          email,
          fullName,
          uniqueId,
          invitationSent: invitationSent === "TRUE",
        });
      }
    }

    const total = participants.length;
    const sent = participants.filter((p) => p.invitationSent).length;
    const pending = total - sent;

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        stats: { total, sent, pending },
        pendingList: participants.filter((p) => !p.invitationSent).slice(0, 50),
      });
    }

    if (req.method === "POST") {
      const { batchSize = 5, skipGmail = false, adminPassword } = req.body || {};

      if (adminPassword !== "Pec@123") {
        return res.status(401).json({ success: false, message: "Unauthorized. Invalid admin password." });
      }

      const pendingParticipants = participants.filter((p) => !p.invitationSent).slice(0, Number(batchSize));

      if (pendingParticipants.length === 0) {
        return res.status(200).json({
          success: true,
          message: "All participants have already been sent invitations!",
          stats: { total, sent, pending: 0 },
          results: [],
        });
      }

      const results = [];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://technova-event-pass.vercel.app";

      for (const p of pendingParticipants) {
        const claimLink = `${appUrl}/claim-pass`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
            <h2 style="color: #4f46e5; text-align: center;">TECHNOVA 2026 Event Pass</h2>
            <p>Dear <strong>${p.fullName}</strong>,</p>
            <p>We are thrilled to welcome you to <strong>TECHNOVA 2026</strong>! Your registration has been confirmed.</p>
            <p>Please claim your official digital event pass and upload your photo before arriving at the venue.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${claimLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Claim & Download Your Pass
              </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; text-align: center;">
              Or copy and paste this URL into your browser: <br>
              <a href="${claimLink}" style="color: #4f46e5;">${claimLink}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              This is an automated message from the TECHNOVA 2026 Event Team. Please do not reply directly to this email.
            </p>
          </div>
        `;

        try {
          const mailRes = await sendSmartEmail({
            to: p.email,
            subject: "Claim Your TECHNOVA 2026 Digital Event Pass",
            html: htmlContent,
            skipGmail: Boolean(skipGmail),
          });

          // Update Google Sheet Column O (invitationSent) & Column P (invitationTimestamp)
          const colO = getColumnLetter(cols.invitationSent);
          const colP = getColumnLetter(cols.invitationTimestamp);

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Sheet1!${colO}${p.rowIndex}:${colP}${p.rowIndex}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
              values: [["TRUE", new Date().toISOString()]],
            },
          });

          results.push({
            rowIndex: p.rowIndex,
            email: p.email,
            fullName: p.fullName,
            status: "SUCCESS",
            provider: mailRes.provider,
          });
        } catch (err) {
          console.error(`Failed to send invitation to ${p.email}:`, err.message);
          results.push({
            rowIndex: p.rowIndex,
            email: p.email,
            fullName: p.fullName,
            status: "FAILED",
            error: err.message,
          });
        }
      }

      const newlySentCount = results.filter((r) => r.status === "SUCCESS").length;

      return res.status(200).json({
        success: true,
        message: `Processed ${results.length} invitations. (${newlySentCount} sent successfully)`,
        stats: {
          total,
          sent: sent + newlySentCount,
          pending: pending - newlySentCount,
        },
        results,
      });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("sendBulkInvitations API Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
