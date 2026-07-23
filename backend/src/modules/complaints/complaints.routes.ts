import { OwnerType, StaffRole } from "@abc/shared";
import { Router } from "express";
import { requireAuth, requireOwnerType, requireRole } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import * as controller from "./complaints.controller";

export const complaintsRouter = Router();

complaintsRouter.use(requireAuth);

complaintsRouter.post(
  "/",
  requireOwnerType(OwnerType.CITIZEN),
  upload.array("images", 5),
  controller.createComplaintHandler,
);
complaintsRouter.get("/", controller.listComplaintsHandler);
complaintsRouter.get("/summary", requireOwnerType(OwnerType.CITIZEN), controller.citizenDashboardHandler);
complaintsRouter.get(
  "/export",
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  controller.exportComplaintsHandler,
);
complaintsRouter.get("/:id", controller.getComplaintHandler);
complaintsRouter.get("/:id/timeline", controller.getComplaintTimelineHandler);
complaintsRouter.patch(
  "/:id/assign",
  requireRole(StaffRole.MLA, StaffRole.SUPER_ADMIN),
  controller.assignComplaintHandler,
);
complaintsRouter.patch(
  "/:id/status",
  requireOwnerType(OwnerType.STAFF),
  controller.updateComplaintStatusHandler,
);
complaintsRouter.post(
  "/:id/images",
  requireOwnerType(OwnerType.STAFF),
  upload.array("images", 5),
  controller.addComplaintImagesHandler,
);
complaintsRouter.post(
  "/:id/feedback",
  requireOwnerType(OwnerType.CITIZEN),
  controller.createFeedbackHandler,
);
complaintsRouter.get("/:id/feedback", controller.getFeedbackHandler);
