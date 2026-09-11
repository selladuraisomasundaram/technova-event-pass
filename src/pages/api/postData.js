import { getGoogleSheetsClient, resolveColumnIndices, getColumnLetter, normalizeText } from "@/utils/sheetHelpers";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // GET: Metadata endpoints
  if (req.method === "GET") {
    return res.status(200).json({
      commonEvents: [
        "Startup Interaction Session",
        "Keynote Networking",
        "Project Exhibition",
        "Panel Discussion"
      ],
      departments: {
        "Paavai Engineering College": ["CSE", "ECE", "EEE", "Mech", "Civil", "IT", "AIDS", "AIML"],
        "Other Institutions": ["General"]
      }
    });
  }

  // POST: Volunteer QR Code Entry Scan Verification
  const { data: scannedId, category } = req.body;

  if (!scannedId) {
    return res.status(400).json({ message: "No Pass ID scanned." });
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
    const targetScannedNorm = normalizeText(scannedId);

    let rowIndex = -1;
    let participantRow = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const uniqueId = normalizeText(row[colIdx.uniqueId]);
      const email = normalizeText(row[colIdx.email]);
      const mobile = normalizeText(row[colIdx.mobile]);

      if (uniqueId === targetScannedNorm || (targetScannedNorm && (email === targetScannedNorm || mobile === targetScannedNorm))) {
        rowIndex = i + 1;
        participantRow = row;
        break;
      }
    }

    if (!participantRow || rowIndex === -1) {
      return res.status(404).json({ message: `Invalid Pass ID "${scannedId}". Record not found in database.` });
    }

    const name = participantRow[colIdx.fullName] || "Participant";
    const institution = participantRow[colIdx.institution] || "Paavai Engineering College";
    const partCategory = participantRow[colIdx.category] || "Student";
    const department = participantRow[colIdx.department] || "";
    const currentStatus = (participantRow[colIdx.status] || "").toString().trim();
    const photoUrl = participantRow[colIdx.photoUrl] || "";

    if (currentStatus.toLowerCase() === "checked in") {
      return res.status(400).json({
        message: `Already Checked In: "${name}" has already been verified at the entry gate.`,
        name,
        institution,
        category: partCategory,
        department,
        photoUrl,
      });
    }

    // Perform Check-in Update
    const timestampStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const statusColLetter = getColumnLetter(colIdx.status);
    const timestampColLetter = getColumnLetter(colIdx.checkInTimestamp);

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `${sheetName}!${statusColLetter}${rowIndex}`,
            values: [["Checked In"]],
          },
          {
            range: `${sheetName}!${timestampColLetter}${rowIndex}`,
            values: [[timestampStr]],
          },
        ],
      },
    });

    return res.status(200).json({
      message: `Check-in Verified for ${name}!`,
      name,
      institution,
      category: partCategory,
      department,
      photoUrl,
      status: "Checked In",
    });
  } catch (error) {
    console.error("Error in postData API (Scan Check-in):", error);
    return res.status(500).json({ message: "Google Sheets check-in error", error: error.message });
  }
}