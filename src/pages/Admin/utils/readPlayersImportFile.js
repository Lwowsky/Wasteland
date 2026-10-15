import { clean } from "./importPlayersNormalization.js";

export async function readPlayersImportFile(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) throw new Error("EMPTY_FILE");

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) throw new Error("EMPTY_FILE");

  const rawHeaders = (matrix[0] || []).map((value) => clean(value));
  const headers = rawHeaders.map(
    (header, index) => header || `Column ${index + 1}`,
  );
  const rows = matrix
    .slice(1)
    .filter((values) => values.some((value) => clean(value) !== ""))
    .map((values, rowIndex) => {
      const row = {};
      headers.forEach((header, columnIndex) => {
        row[header] = values[columnIndex] ?? "";
      });
      return { rowNumber: rowIndex + 2, values: row };
    });

  if (!rows.length) throw new Error("EMPTY_FILE");

  return {
    fileName: file.name,
    sheetName: firstSheetName,
    headers,
    rows,
    total: rows.length,
  };
}

