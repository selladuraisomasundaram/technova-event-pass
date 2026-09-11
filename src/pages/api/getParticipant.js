import { getGoogleSheetsClient, resolveColumnIndices, normalizeText } from "@/utils/sheetHelpers";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "Participant ID is required" });
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
    const targetIdNorm = normalizeText(id);

    let participant = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const uniqueId = normalizeText(row[colIdx.uniqueId]);
      const email = normalizeText(row[colIdx.email]);
      const mobile = normalizeText(row[colIdx.mobile]);

      if (uniqueId === targetIdNorm || email === targetIdNorm || mobile === targetIdNorm) {
        participant = {
          uniqueId: row[colIdx.uniqueId] || id,
          name: row[colIdx.fullName] || "Participant",
          email: row[colIdx.email] || "",
          mobile: row[colIdx.mobile] || "",
          institution: row[colIdx.institution] || "Paavai Engineering College",
          category: row[colIdx.category] || "Student",
          department: row[colIdx.department] || "",
          yearOfStudy: row[colIdx.yearOfStudy] || "",
          photoUrl: row[colIdx.photoUrl] || "",
          status: row[colIdx.status] || "Pending",
        };
        break;
      }
    }

    if (!participant) {
      return res.status(404).json({ message: `Pass ID "${id}" not found.` });
    }

    return res.status(200).json(participant);
  } catch (error) {
    console.error("Error in getParticipant API:", error);
    return res.status(500).json({ message: "Google Sheets error", error: error.message });
  }
}
