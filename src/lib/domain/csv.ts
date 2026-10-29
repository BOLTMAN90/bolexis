const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const guarded = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
  ];
  return lines.join("\r\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((parsed) => parsed.some((value) => value.trim().length > 0));
}

export type CsvIssue = { row: number; message: string };

const LEAD_HEADERS = [
  "full_name",
  "email",
  "phone",
  "source",
  "status",
  "budget_amount",
  "budget_currency",
  "preferred_location",
  "property_type",
  "buying_timeline_days",
  "notes",
  "consent_to_contact",
] as const;

export function validateLeadCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
  issues: CsvIssue[];
} {
  const parsed = parseCsv(text);
  if (parsed.length === 0) {
    return { headers: [], rows: [], issues: [{ row: 1, message: "The file is empty." }] };
  }
  const headers = parsed[0].map((header) => header.trim());
  const issues: CsvIssue[] = [];
  for (const required of ["full_name"]) {
    if (!headers.includes(required)) {
      issues.push({ row: 1, message: `Missing required column ${required}.` });
    }
  }
  const unknown = headers.filter((header) => !LEAD_HEADERS.includes(header as (typeof LEAD_HEADERS)[number]));
  for (const header of unknown) {
    issues.push({ row: 1, message: `Unknown column ${header}.` });
  }
  if (issues.length > 0) {
    return { headers, rows: [], issues };
  }

  const rows = parsed.slice(1).map((values, index) => {
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[header] = values[cellIndex]?.trim() ?? "";
    });
    if (!record.full_name) {
      issues.push({ row: index + 2, message: "Full name is required." });
    }
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      issues.push({ row: index + 2, message: "Email is invalid." });
    }
    if (record.budget_amount && Number.isNaN(Number(record.budget_amount))) {
      issues.push({ row: index + 2, message: "Budget must be a number." });
    }
    return record;
  });

  return { headers, rows: issues.length > 0 ? [] : rows, issues };
}
