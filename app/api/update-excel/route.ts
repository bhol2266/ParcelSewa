import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface PassportData {
  surname: string;
  givenNames: string;
  fullName: string;
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  dateOfIssue: string;
  nationality: string;
  sex: string;
  placeOfBirth: string;
  personalNumber: string;
  permanentAddress: string;
  oldPassportNumber: string;
}

function calculateAge(dob: string): number {
  try {
    const date = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return isNaN(age) ? 0 : age;
  } catch {
    return 0;
  }
}

function clearAndSetCell(
  row: ExcelJS.Row,
  colIndex: number,
  value: ExcelJS.CellValue,
  isHeader = false
) {
  const cell = row.getCell(colIndex);
  cell.style = {};
  cell.value = value;
  cell.border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
  cell.font = {
    name: "Arial",
    size: isHeader ? 11 : 10,
    bold: isHeader,
    italic: false,
    color: { argb: "FF000000" },
  };
  cell.fill = isHeader
    ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } }
    : { type: "pattern", pattern: "none" };
  cell.numFmt = "@";
}

// Column definitions: [header label, data key]
const COLUMNS: [string, keyof PassportData | "age" | "srNo" | "designation" | "oldPassport" | "remarks"][] = [
  ["SR. NO.", "srNo"],
  ["DESIGNATION", "designation"],
  ["FULL NAME", "fullName"],
  ["OLD PASSPORT UPDATED", "oldPassport"],
  ["PASSPORT NO.", "passportNumber"],
  ["DATE OF EXPIRY", "dateOfExpiry"],
  ["DATE OF BIRTH", "dateOfBirth"],
  ["AGE", "age"],
  ["REMARKS", "remarks"],
  ["PERMANENT ADDRESS", "permanentAddress"],
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const excelFile = formData.get("excel") as File | null;
    const passportDataRaw = formData.get("passportData") as string;
    const mode = (formData.get("mode") as string) || "existing"; // "existing" | "new"

    if (!passportDataRaw) {
      return NextResponse.json({ error: "Missing passport data" }, { status: 400 });
    }
    if (mode === "existing" && !excelFile) {
      return NextResponse.json({ error: "Missing excel file" }, { status: 400 });
    }

    const passportRecords: PassportData[] = JSON.parse(passportDataRaw);

    const workbook = new ExcelJS.Workbook();
    let sheet: ExcelJS.Worksheet | undefined;
    let lastDataRow = 1;
    let nextSr = 1;

    // ── Existing file mode ──────────────────────────────────────────────────
    if (mode === "existing" && excelFile) {
      const arrayBuffer = await excelFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      sheet = workbook.worksheets[0];

      // Ensure the address columns exist in the header (row 1 or 2)
      // We check row 1 for the header; if address columns are missing, add them.
      const headerRow = sheet.getRow(1);
      const existingHeaders: string[] = [];
      headerRow.eachCell((cell) => {
        existingHeaders.push(String(cell.value || "").toUpperCase().trim());
      });

      const currentColCount = existingHeaders.length || 9;

      // Map of extra columns to add if missing
      const extraColumns: [string, number][] = [
        ["PERMANENT ADDRESS", 10],
      ];

      for (const [label, colIdx] of extraColumns) {
        const alreadyExists = existingHeaders.some((h) => h.includes("ADDRESS"));
        if (!alreadyExists || currentColCount < colIdx) {
          sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              clearAndSetCell(row, colIdx, label, true);
              row.commit();
            }
          });
        }
      }

      // Find last data row
      sheet.eachRow((row, rowNumber) => {
        if (
          rowNumber >= 3 &&
          row.getCell(1).value !== null &&
          row.getCell(1).value !== undefined &&
          String(row.getCell(1).value).trim() !== ""
        ) {
          lastDataRow = rowNumber;
        }
      });
      if (lastDataRow < 2) lastDataRow = 2;

      // Determine nextSr
      const lastSrCell = sheet.getRow(lastDataRow).getCell(1);
      if (lastSrCell.value && typeof lastSrCell.value === "number") {
        nextSr = (lastSrCell.value as number) + 1;
      }

      // ── Duplicate detection ──────────────────────────────────────────────
      const existingPassportNos = new Set<string>();
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
          const val = String(row.getCell(5).value || "").trim().toUpperCase();
          if (val) existingPassportNos.add(val);
        }
      });

      const duplicates = passportRecords
        .map((r) => r.passportNumber?.trim().toUpperCase())
        .filter((p) => p && existingPassportNos.has(p));

      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "DUPLICATE_FOUND",
            duplicates,
            message: `Duplicate passport number(s) found: ${duplicates.join(", ")}. These records already exist in the file.`,
          },
          { status: 409 }
        );
      }
    }

    // ── New file mode ───────────────────────────────────────────────────────
    if (mode === "new") {
      sheet = workbook.addWorksheet("Passport Data");

      // Write header row
      const headerRow = sheet.getRow(1);
      COLUMNS.forEach(([label], i) => {
        clearAndSetCell(headerRow, i + 1, label, true);
      });
      headerRow.height = 22;
      headerRow.commit();

      lastDataRow = 1;
      nextSr = 1;

      // Set column widths (use local ref so TS keeps the narrowing inside the callback)
      const widths = [8, 14, 30, 20, 18, 16, 16, 8, 16, 35];
      const newSheet = sheet;
      widths.forEach((w, i) => {
        newSheet.getColumn(i + 1).width = w;
      });
    }

    // ── Write records ───────────────────────────────────────────────────────
    if (!sheet) {
      return NextResponse.json({ error: "Worksheet could not be initialised" }, { status: 500 });
    }
    // For "new" mode also check duplicates within the batch being inserted
    const batchPassportNos = new Set<string>();
    const batchDuplicates: string[] = [];
    for (const record of passportRecords) {
      const pn = record.passportNumber?.trim().toUpperCase();
      if (pn) {
        if (batchDuplicates.includes(pn) || batchPassportNos.has(pn)) {
          batchDuplicates.push(pn);
        } else {
          batchPassportNos.add(pn);
        }
      }
    }
    if (batchDuplicates.length > 0) {
      return NextResponse.json(
        {
          error: "DUPLICATE_FOUND",
          duplicates: [...new Set(batchDuplicates)],
          message: `Duplicate passport number(s) in current batch: ${[...new Set(batchDuplicates)].join(", ")}.`,
        },
        { status: 409 }
      );
    }

    for (const record of passportRecords) {
      const newRowNum = lastDataRow + 1;
      lastDataRow = newRowNum;

      const row = sheet.getRow(newRowNum);

      // Clear entire row first
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.style = {};
        cell.value = null;
      });

      clearAndSetCell(row, 1, nextSr++);
      clearAndSetCell(row, 2, "GARDENER");
      clearAndSetCell(row, 3, record.fullName || `${record.givenNames} ${record.surname}`);
      clearAndSetCell(row, 4, record.oldPassportNumber || "");
      clearAndSetCell(row, 5, record.passportNumber);
      clearAndSetCell(row, 6, record.dateOfExpiry);
      clearAndSetCell(row, 7, record.dateOfBirth);
      clearAndSetCell(row, 8, calculateAge(record.dateOfBirth));
      clearAndSetCell(row, 9, "");
      clearAndSetCell(row, 10, record.permanentAddress || "");

      row.height = 18;
      row.commit();
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename =
      mode === "new" ? "passport_data_new.xlsx" : "passport_data_updated.xlsx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update Excel file" }, { status: 500 });
  }
}