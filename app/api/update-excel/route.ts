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
}

function calculateAge(dob: string): number {
  try {
    // Parse DD MMM YYYY format
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const excelFile = formData.get("excel") as File;
    const passportDataRaw = formData.get("passportData") as string;

    if (!excelFile || !passportDataRaw) {
      return NextResponse.json({ error: "Missing excel or passport data" }, { status: 400 });
    }

    const passportRecords: PassportData[] = JSON.parse(passportDataRaw);

    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];

    // Find the last row with data to append after
    let lastDataRow = 2; // header rows are 1-3
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 3 && row.getCell(1).value !== null && row.getCell(1).value !== undefined) {
        lastDataRow = rowNumber;
      }
    });

    // Get next SR. NO.
    let nextSr = 1;
    const lastSrCell = sheet.getRow(lastDataRow).getCell(1);
    if (lastSrCell.value && typeof lastSrCell.value === "number") {
      nextSr = (lastSrCell.value as number) + 1;
    }

    for (const record of passportRecords) {
      const newRow = lastDataRow + 1;
      lastDataRow = newRow;

      const row = sheet.getRow(newRow);
      row.getCell(1).value = nextSr++;
      row.getCell(2).value = "GARDENER";
      row.getCell(3).value = record.fullName || `${record.givenNames} ${record.surname}`;
      row.getCell(4).value = ""; // OLD PASSPORT UPDATED
      row.getCell(5).value = record.passportNumber;
      row.getCell(6).value = record.dateOfExpiry;
      row.getCell(7).value = record.dateOfBirth;
      row.getCell(8).value = calculateAge(record.dateOfBirth);
      row.getCell(9).value = ""; // REMARKS

      // Apply basic formatting matching existing rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Arial", size: 10 };
      });

      row.commit();
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="passport_data_updated.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update Excel file" }, { status: 500 });
  }
}