import { getGoogleSheetsClient, resolveColumnIndices, getColumnLetter } from "@/utils/sheetHelpers";
import { sendSmartEmail } from "@/utils/mailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { query, photo, rowIndex } = req.body;

  if (!query && !rowIndex) {
    return res.status(400).json({ message: "Participant identifier or row index is required" });
  }

  try {
    const { sheets, spreadsheetId } = getGoogleSheetsClient();

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = spreadsheet.data.sheets[0].properties.title;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return res.status(404).json({ message: "Database is empty." });
    }

    const colIdx = resolveColumnIndices(rows[0]);
    let targetRowIndex = rowIndex;
    let targetRow = null;

    if (targetRowIndex && rows[targetRowIndex - 1]) {
      targetRow = rows[targetRowIndex - 1];
    } else {
      // Find row by query
      const searchNorm = query.toString().trim().toLowerCase();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const email = (row[colIdx.email] || "").toString().trim().toLowerCase();
        const mobile = (row[colIdx.mobile] || "").toString().trim();
        const name = (row[colIdx.fullName] || "").toString().trim().toLowerCase();
        const uniqueId = (row[colIdx.uniqueId] || "").toString().trim().toLowerCase();

        if (email === searchNorm || mobile === searchNorm || name === searchNorm || uniqueId === searchNorm) {
          targetRowIndex = i + 1;
          targetRow = row;
          break;
        }
      }
    }

    if (!targetRow || !targetRowIndex) {
      return res.status(404).json({ message: "Participant record not found." });
    }

    let existingId = targetRow[colIdx.uniqueId];
    if (!existingId || !existingId.trim()) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      existingId = `TECH-${randomSuffix}`;
    }

    const name = targetRow[colIdx.fullName] || "Participant";
    const email = targetRow[colIdx.email] || "";
    const department = targetRow[colIdx.department] || "";
    const institution = targetRow[colIdx.institution] || "";

    // Batch update Google Sheet for columns J (Unique ID), K (Pass Issued), L (Photo URL/Base64)
    const updates = [
      {
        range: `${sheetName}!${getColumnLetter(colIdx.uniqueId)}${targetRowIndex}`,
        values: [[existingId]],
      },
      {
        range: `${sheetName}!${getColumnLetter(colIdx.passIssued)}${targetRowIndex}`,
        values: [["TRUE"]],
      },
    ];

    if (photo) {
      updates.push({
        range: `${sheetName}!${getColumnLetter(colIdx.photoUrl)}${targetRowIndex}`,
        values: [[photo]],
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    });

    // Optional email confirmation
    const passUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/pass/${existingId}`;
    if (email && email.includes("@")) {
      sendSmartEmail({
        to: email,
        subject: `Your Official Event Pass - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #ea580c; margin: 0; font-size: 24px;">Paavai Engineering College</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Startup Interaction & Event Pass Portal</p>
            </div>
            
            <p style="font-size: 16px; color: #1f2937;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #4b5563; line-height: 1.5;">Your entry pass for the upcoming event has been successfully generated!</p>

            <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <p style="color: #c2410c; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin: 0 0 4px 0;">UNIQUE ENTRY ID</p>
              <p style="font-family: monospace; font-size: 26px; font-weight: bold; color: #9a3412; margin: 0;">${existingId}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${passUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.3);">View & Download My Digital Pass</a>
            </div>

            <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px;">Please present this pass QR code at the event entry gate for venue check-in.</p>
          </div>
        `,
      }).catch((mailErr) => {
        console.warn("Background email notification error:", mailErr.message);
      });
    }

    return res.status(200).json({
      message: "Pass issued successfully!",
      uniqueId: existingId,
      passUrl,
    });
  } catch (error) {
    console.error("Error in claimPass API:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate pass in Google Sheets.",
    });
  }
}
