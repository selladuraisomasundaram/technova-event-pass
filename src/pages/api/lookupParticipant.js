import { getGoogleSheetsClient, resolveColumnIndices, normalizeText, cleanSearchTerm } from "@/utils/sheetHelpers";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const query = req.method === "POST" ? req.body.query : req.query.query;

  if (!query || !query.trim()) {
    return res.status(400).json({ message: "Search query (Email Address or Mobile Number) is required" });
  }

  const searchTerm = query.trim();
  const cleanedSearch = cleanSearchTerm(searchTerm);
  const normalizedSearch = normalizeText(searchTerm);

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
      return res.status(404).json({ message: "No registration records found in the database." });
    }

    const colIdx = resolveColumnIndices(rows[0]);
    let matchRow = null;
    let matchRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const email = normalizeText(row[colIdx.email]);
      const mobile = cleanSearchTerm(row[colIdx.mobile]);
      const existingId = normalizeText(row[colIdx.uniqueId]);

      // STRICT MATCHING: Match ONLY by Email Address, Mobile Number, or existing Unique Pass ID
      const isEmailMatch = email && (email === normalizedSearch || email.includes(normalizedSearch));
      const isMobileMatch = mobile && (mobile === cleanedSearch || mobile.endsWith(cleanedSearch) || cleanedSearch.endsWith(mobile));
      const isIdMatch = existingId && existingId === normalizedSearch;

      if (isEmailMatch || isMobileMatch || isIdMatch) {
        matchRow = row;
        matchRowIndex = i + 1;
        break;
      }
    }

    if (!matchRow) {
      return res.status(404).json({
        message: `No record found matching "${searchTerm}". Please check your email address or 10-digit mobile number.`,
      });
    }

    const uniqueId = matchRow[colIdx.uniqueId] || "";
    const passIssuedRaw = matchRow[colIdx.passIssued] || "";
    const photoUrl = matchRow[colIdx.photoUrl] || "";

    const isPassIssued = Boolean(
      (passIssuedRaw.toString().trim().toLowerCase() === "true" ||
        passIssuedRaw.toString().trim().toLowerCase() === "yes") &&
      photoUrl.toString().trim().length > 0
    );

    const participant = {
      rowIndex: matchRowIndex,
      name: matchRow[colIdx.fullName] || "Participant",
      mobile: matchRow[colIdx.mobile] || "",
      email: matchRow[colIdx.email] || "",
      institution: matchRow[colIdx.institution] || "Paavai Engineering College",
      category: matchRow[colIdx.category] || "Student",
      department: matchRow[colIdx.department] || "",
      yearOfStudy: matchRow[colIdx.yearOfStudy] || "",
      startupInterest: matchRow[colIdx.startupInterest] || "",
      uniqueId: uniqueId,
      isPassIssued: isPassIssued,
      photoUrl: photoUrl,
      status: matchRow[colIdx.status] || "Pending",
    };

    return res.status(200).json(participant);
  } catch (error) {
    console.error("Error in lookupParticipant API:", error);
    return res.status(500).json({
      message: error.message || "Failed to search Google Sheets database.",
    });
  }
}
