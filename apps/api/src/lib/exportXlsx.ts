import ExcelJS from "exceljs";

export interface ExportRow {
  author: string;
  category: string;
  subcategory: string | null;
  businessName: string;
  city: string | null;
  state: string | null;
  tier: string;
  comment: string | null;
  hasPhoto: boolean;
  createdAt: Date;
}

export async function buildLikeysWorkbook(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Likeys");

  sheet.columns = [
    { header: "Author", key: "author", width: 18 },
    { header: "Category", key: "category", width: 14 },
    { header: "Subcategory", key: "subcategory", width: 16 },
    { header: "Business", key: "businessName", width: 28 },
    { header: "City", key: "city", width: 16 },
    { header: "State", key: "state", width: 8 },
    { header: "Tier", key: "tier", width: 12 },
    { header: "Comment", key: "comment", width: 40 },
    { header: "Has Photo", key: "hasPhoto", width: 10 },
    { header: "Posted", key: "createdAt", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      ...row,
      subcategory: row.subcategory ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      comment: row.comment ?? "",
      hasPhoto: row.hasPhoto ? "Yes" : "No",
      createdAt: row.createdAt,
    });
  }
  sheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
