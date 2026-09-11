import { google } from "googleapis";

// Normalize text by lowercasing and trimming
export const normalizeText = (str) => {
  if (!str) return "";
  return str.toString().trim().toLowerCase();
};

// Clean string for loose comparison (removes non-alphanumeric chars)
export const cleanSearchTerm = (str) => {
  if (!str) return "";
  return str.toString().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

// Convert column index (0-based) to Sheet Column Letter (A, B, ..., Z, AA, etc.)
export const getColumnLetter = (colIndex) => {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Get authenticated Google Sheets API client
export const getGoogleSheetsClient = () => {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Server configuration error: Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables.");
  }
  if (!process.env.SPREADSHEET_ID) {
    throw new Error("Server configuration error: Missing SPREADSHEET_ID in environment variables.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId: process.env.SPREADSHEET_ID,
  };
};

// Maps column indexes from row 0 headers dynamically with fallback defaults
export const resolveColumnIndices = (headers) => {
  const normalizedHeaders = headers.map((h) => normalizeText(h));

  const findIdx = (keywords) => {
    return normalizedHeaders.findIndex((h) =>
      keywords.some((kw) => h.includes(kw))
    );
  };

  return {
    timestamp: findIdx(["timestamp"]) !== -1 ? findIdx(["timestamp"]) : 0,
    fullName: findIdx(["full name", "name"]) !== -1 ? findIdx(["full name", "name"]) : 1,
    mobile: findIdx(["mobile", "phone", "contact"]) !== -1 ? findIdx(["mobile", "phone", "contact"]) : 2,
    email: findIdx(["email"]) !== -1 ? findIdx(["email"]) : 3,
    institution: findIdx(["institution", "organization", "college"]) !== -1 ? findIdx(["institution", "organization", "college"]) : 4,
    category: findIdx(["category", "participant category"]) !== -1 ? findIdx(["category", "participant category"]) : 5,
    department: findIdx(["department", "area of specialization", "dept"]) !== -1 ? findIdx(["department", "area of specialization", "dept"]) : 6,
    yearOfStudy: findIdx(["year of study", "year"]) !== -1 ? findIdx(["year of study", "year"]) : 7,
    startupInterest: findIdx(["interested in interacting", "startup"]) !== -1 ? findIdx(["interested in interacting", "startup"]) : 8,

    // Generated / Updated Columns (Default to Columns J, K, L, M, N)
    uniqueId: findIdx(["unique pass id", "unique id", "pass id"]) !== -1 ? findIdx(["unique pass id", "unique id", "pass id"]) : 9,
    passIssued: findIdx(["pass issued", "issued"]) !== -1 ? findIdx(["pass issued", "issued"]) : 10,
    photoUrl: findIdx(["photo url", "photo", "image"]) !== -1 ? findIdx(["photo url", "photo", "image"]) : 11,
    status: findIdx(["status", "check-in status"]) !== -1 ? findIdx(["status", "check-in status"]) : 12,
    checkInTimestamp: findIdx(["check-in timestamp", "scan time", "timestamp checkin"]) !== -1 ? findIdx(["check-in timestamp", "scan time", "timestamp checkin"]) : 13,
  };
};
