import { StaffRole } from "@abc/shared";
import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import * as feedbackService from "./feedback.service";

export const feedbackRouter = Router();

feedbackRouter.get(
  "/",
  requireAuth,
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const { satisfied, page = "1", pageSize = "20" } = req.query as Record<string, string | undefined>;
    const result = await feedbackService.listFeedback({
      satisfied: satisfied === undefined ? undefined : satisfied === "true",
      page: Number(page),
      pageSize: Number(pageSize),
    });
    res.json(result);
  }),
);
