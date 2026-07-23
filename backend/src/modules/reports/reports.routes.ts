import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import type { ReportPeriod } from "../../lib/dateRanges";
import { AppError } from "../../lib/errors";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import * as reportsService from "./reports.service";
import { streamExcelReport, streamPdfReport } from "./reports.export";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN));

function parsePeriod(value: unknown): ReportPeriod {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "yearly") return value;
  return "monthly";
}

reportsRouter.get(
  "/complaints",
  asyncHandler(async (req, res) => {
    const summary = await reportsService.getPeriodSummary(parsePeriod(req.query.period), req.query.date as string);
    res.json(summary);
  }),
);

reportsRouter.get(
  "/ward-wise",
  asyncHandler(async (_req, res) => {
    res.json({ items: await reportsService.getWardWiseReport() });
  }),
);

reportsRouter.get(
  "/category-wise",
  asyncHandler(async (_req, res) => {
    res.json({ items: await reportsService.getCategoryWiseReport() });
  }),
);

reportsRouter.get(
  "/officer-wise",
  asyncHandler(async (_req, res) => {
    res.json({ items: await reportsService.getOfficerWiseReport() });
  }),
);

reportsRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const period = parsePeriod(req.query.period);
    const type = req.query.type === "pdf" ? "pdf" : req.query.type === "excel" ? "excel" : null;
    if (!type) throw new AppError(400, "INVALID_TYPE", "type must be 'pdf' or 'excel'");

    if (type === "excel") {
      await streamExcelReport(period, res);
    } else {
      await streamPdfReport(period, res);
    }
  }),
);
