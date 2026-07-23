import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { ReportPeriod } from "../../lib/dateRanges";
import * as reportsService from "./reports.service";

async function gatherReportData(period: ReportPeriod) {
  const [summary, wardWise, categoryWise, officerWise] = await Promise.all([
    reportsService.getPeriodSummary(period),
    reportsService.getWardWiseReport(),
    reportsService.getCategoryWiseReport(),
    reportsService.getOfficerWiseReport(),
  ]);
  return { summary, wardWise, categoryWise, officerWise };
}

export async function streamExcelReport(period: ReportPeriod, res: Response) {
  const { summary, wardWise, categoryWise, officerWise } = await gatherReportData(period);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRow(["Period", summary.period]);
  summarySheet.addRow(["From", summary.start.toLocaleDateString()]);
  summarySheet.addRow(["To", summary.end.toLocaleDateString()]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Total", "Received", "Assigned", "In Progress", "Completed", "Rejected"]);
  summarySheet.addRow([
    summary.total,
    summary.received,
    summary.assigned,
    summary.inProgress,
    summary.completed,
    summary.rejected,
  ]);

  const wardSheet = workbook.addWorksheet("Ward-wise");
  wardSheet.addRow(["Ward #", "Ward Name", "Total", "Pending", "Completed"]);
  wardWise.forEach((r) => wardSheet.addRow([r.ward.wardNumber, r.ward.name, r.total, r.pending, r.completed]));

  const categorySheet = workbook.addWorksheet("Category-wise");
  categorySheet.addRow(["Category", "Total", "Pending", "Completed"]);
  categoryWise.forEach((r) => categorySheet.addRow([r.category.name, r.total, r.pending, r.completed]));

  const officerSheet = workbook.addWorksheet("Officer-wise");
  officerSheet.addRow(["Officer", "Assigned", "Pending", "Completed", "Avg Resolution (hrs)"]);
  officerWise.forEach((r) =>
    officerSheet.addRow([
      r.staff.name,
      r.assigned,
      r.pending,
      r.completed,
      r.avgResolutionHours ? r.avgResolutionHours.toFixed(1) : "—",
    ]),
  );

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="report-${period}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function streamPdfReport(period: ReportPeriod, res: Response) {
  const { summary, wardWise, categoryWise, officerWise } = await gatherReportData(period);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="report-${period}.pdf"`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(16).text("Atul Bhansali Citizen Connect — Complaint Report", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .text(`Period: ${summary.period} (${summary.start.toLocaleDateString()} – ${summary.end.toLocaleDateString()})`);
  doc.moveDown();

  doc.fontSize(12).text("Summary", { underline: true });
  doc
    .fontSize(10)
    .text(
      `Total: ${summary.total}  |  Received: ${summary.received}  |  Assigned: ${summary.assigned}  |  In Progress: ${summary.inProgress}  |  Completed: ${summary.completed}  |  Rejected: ${summary.rejected}`,
    );
  doc.moveDown();

  doc.fontSize(12).text("Ward-wise", { underline: true });
  wardWise.forEach((r) => {
    doc.fontSize(9).text(`Ward ${r.ward.wardNumber} (${r.ward.name}): ${r.total} total, ${r.pending} pending, ${r.completed} completed`);
  });
  doc.moveDown();

  doc.fontSize(12).text("Category-wise", { underline: true });
  categoryWise.forEach((r) => {
    doc.fontSize(9).text(`${r.category.name}: ${r.total} total, ${r.pending} pending, ${r.completed} completed`);
  });
  doc.moveDown();

  doc.fontSize(12).text("Officer-wise", { underline: true });
  officerWise.forEach((r) => {
    doc
      .fontSize(9)
      .text(
        `${r.staff.name}: ${r.assigned} assigned, ${r.pending} pending, ${r.completed} completed, avg resolution ${r.avgResolutionHours ? r.avgResolutionHours.toFixed(1) + "h" : "—"}`,
      );
  });

  doc.end();
}
