import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

interface AlertRow {
  createdAt: Date;
  freelancer: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  statedTotal: number;
  calculatedTotal: number;
  discrepancyAmount: number;
  sourceEmail: string;
  lineItems: string;
  account: { email: string };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildCsv(alerts: AlertRow[]): string {
  const header = [
    "Date",
    "Freelancer",
    "Invoice #",
    "Invoice Date",
    "Account",
    "Stated Total",
    "Calculated Total",
    "Discrepancy",
    "Source Email",
  ].join(",");

  const rows = alerts.map((a) =>
    [
      formatDate(a.createdAt),
      `"${a.freelancer.replace(/"/g, '""')}"`,
      a.invoiceNumber || "",
      a.invoiceDate || "",
      a.account.email,
      a.statedTotal.toFixed(2),
      a.calculatedTotal.toFixed(2),
      a.discrepancyAmount.toFixed(2),
      a.sourceEmail,
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

async function buildExcel(alerts: AlertRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RotoMath";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Discrepancy Report");

  sheet.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Freelancer", key: "freelancer", width: 24 },
    { header: "Invoice #", key: "invoiceNumber", width: 14 },
    { header: "Invoice Date", key: "invoiceDate", width: 14 },
    { header: "Account", key: "account", width: 28 },
    { header: "Stated Total", key: "statedTotal", width: 16 },
    { header: "Calculated Total", key: "calculatedTotal", width: 16 },
    { header: "Discrepancy", key: "discrepancy", width: 16 },
    { header: "Source Email", key: "sourceEmail", width: 28 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1a1a2e" },
  };

  for (const alert of alerts) {
    sheet.addRow({
      date: formatDate(alert.createdAt),
      freelancer: alert.freelancer,
      invoiceNumber: alert.invoiceNumber || "—",
      invoiceDate: alert.invoiceDate || "—",
      account: alert.account.email,
      statedTotal: alert.statedTotal,
      calculatedTotal: alert.calculatedTotal,
      discrepancy: alert.discrepancyAmount,
      sourceEmail: alert.sourceEmail,
    });
  }

  ["statedTotal", "calculatedTotal", "discrepancy"].forEach((key) => {
    const col = sheet.getColumn(key);
    col.numFmt = '"$"#,##0.00';
  });

  // Summary row
  const totalRow = sheet.addRow({});
  totalRow.getCell("account").value = "TOTALS";
  totalRow.getCell("account").font = { bold: true };
  totalRow.getCell("statedTotal").value = {
    formula: `SUM(F2:F${alerts.length + 1})`,
  } as any;
  totalRow.getCell("calculatedTotal").value = {
    formula: `SUM(G2:G${alerts.length + 1})`,
  } as any;
  totalRow.getCell("discrepancy").value = {
    formula: `SUM(H2:H${alerts.length + 1})`,
  } as any;
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function buildPdf(
  alerts: AlertRow[],
  dateLabel: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "LETTER", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Invoice Discrepancy Report", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Period: ${dateLabel}  •  Generated: ${formatDate(new Date())}  •  ${alerts.length} alert(s)`, {
        align: "center",
      });
    doc.moveDown(0.8);

    // Summary stats
    const totalDisc = alerts.reduce((s, a) => s + a.discrepancyAmount, 0);
    const avgDisc = alerts.length > 0 ? totalDisc / alerts.length : 0;
    const maxDisc =
      alerts.length > 0
        ? Math.max(...alerts.map((a) => a.discrepancyAmount))
        : 0;

    doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold");
    doc.text(
      `Total Discrepancy: ${formatCurrency(totalDisc)}     Average: ${formatCurrency(avgDisc)}     Largest: ${formatCurrency(maxDisc)}`,
      { align: "center" }
    );
    doc.moveDown(0.8);

    // Table
    const colWidths = [70, 120, 70, 70, 140, 80, 80, 80];
    const headers = [
      "Date",
      "Freelancer",
      "Invoice #",
      "Inv. Date",
      "Account",
      "Stated",
      "Calculated",
      "Discrepancy",
    ];
    const startX = 40;
    let y = doc.y;

    // Header row
    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 18).fill("#1a1a2e");
    let x = startX;
    doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, x + 4, y + 5, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });
    y += 18;

    // Data rows
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    for (let i = 0; i < alerts.length; i++) {
      if (y > 560) {
        doc.addPage();
        y = 40;
      }

      const a = alerts[i];
      if (i % 2 === 0) {
        doc.rect(startX, y, colWidths.reduce((s, w) => s + w, 0), 16).fill("#f5f5f5");
        doc.fillColor("#000000");
      }

      const cells = [
        formatDate(a.createdAt),
        a.freelancer,
        a.invoiceNumber || "—",
        a.invoiceDate || "—",
        a.account.email,
        formatCurrency(a.statedTotal),
        formatCurrency(a.calculatedTotal),
        formatCurrency(a.discrepancyAmount),
      ];

      x = startX;
      cells.forEach((cell, ci) => {
        doc.text(cell, x + 4, y + 4, {
          width: colWidths[ci] - 8,
          lineBreak: false,
        });
        x += colWidths[ci];
      });
      y += 16;
    }

    // Total row
    if (y > 560) {
      doc.addPage();
      y = 40;
    }
    doc.rect(startX, y, colWidths.reduce((s, w) => s + w, 0), 18).fill("#e8e8e8");
    doc.fillColor("#000000").font("Helvetica-Bold");
    x = startX;
    const totalCells = [
      "",
      "",
      "",
      "",
      "TOTALS",
      formatCurrency(alerts.reduce((s, a) => s + a.statedTotal, 0)),
      formatCurrency(alerts.reduce((s, a) => s + a.calculatedTotal, 0)),
      formatCurrency(totalDisc),
    ];
    totalCells.forEach((cell, ci) => {
      doc.text(cell, x + 4, y + 5, {
        width: colWidths[ci] - 8,
        lineBreak: false,
      });
      x += colWidths[ci];
    });

    doc.end();
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const format = req.nextUrl.searchParams.get("format") || "csv";
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const where: any = {
    account: { userId },
    createdAt: {
      gte: new Date(startDate),
      lte: new Date(endDate + "T23:59:59.999Z"),
    },
  };
  if (accountId && accountId !== "all") where.accountId = accountId;

  const alerts = await prisma.alert.findMany({
    where,
    include: { account: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const dateLabel = `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const fileBase = `invoice-discrepancies-${startDate}-to-${endDate}`;

  if (format === "csv") {
    const csv = buildCsv(alerts);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const buffer = await buildExcel(alerts);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileBase}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdf(alerts, dateLabel);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}
