import {
  assignComplaintSchema,
  complaintFiltersSchema,
  createComplaintSchema,
  createFeedbackSchema,
  OwnerType,
  updateComplaintStatusSchema,
} from "@abc/shared";
import ExcelJS from "exceljs";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import * as feedbackService from "../feedback/feedback.service";
import { storageProvider } from "../../storage/storage.factory";
import * as complaintsService from "./complaints.service";

async function uploadFiles(files: Express.Multer.File[] | undefined): Promise<string[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(
    files.map((f) =>
      storageProvider.upload(
        { buffer: f.buffer, originalName: f.originalname, mimeType: f.mimetype },
        "complaints",
      ),
    ),
  );
}

export const createComplaintHandler = asyncHandler(async (req, res) => {
  if (!req.user || req.user.ownerType !== OwnerType.CITIZEN) {
    throw new AppError(403, "FORBIDDEN", "Only citizens can submit complaints");
  }

  const input = createComplaintSchema.parse({
    ...req.body,
    latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : undefined,
    longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : undefined,
  });
  const imageUrls = await uploadFiles(req.files as Express.Multer.File[]);
  const complaint = await complaintsService.createComplaint(req.user.sub, input, imageUrls);
  res.status(201).json(complaint);
});

export const listComplaintsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const filters = complaintFiltersSchema.parse(req.query);
  const result = await complaintsService.listComplaints(req.user, filters);
  res.json(result);
});

export const getComplaintHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const complaint = await complaintsService.getComplaintById(req.user, req.params.id);
  res.json(complaint);
});

export const getComplaintTimelineHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const complaint = await complaintsService.getComplaintById(req.user, req.params.id);
  res.json({ items: complaint.statusHistory });
});

export const assignComplaintHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const { staffId } = assignComplaintSchema.parse(req.body);
  const complaint = await complaintsService.assignComplaint(req.user, req.params.id, staffId);
  res.json(complaint);
});

export const updateComplaintStatusHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const input = updateComplaintStatusSchema.parse(req.body);
  const complaint = await complaintsService.updateComplaintStatus(req.user, req.params.id, input);
  res.json(complaint);
});

export const addComplaintImagesHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const imageUrls = await uploadFiles(req.files as Express.Multer.File[]);
  if (imageUrls.length === 0) throw new AppError(400, "NO_FILES", "No images uploaded");
  const images = await complaintsService.addComplaintImages(req.user, req.params.id, imageUrls);
  res.status(201).json({ items: images });
});

export const createFeedbackHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const input = createFeedbackSchema.parse(req.body);
  const feedback = await feedbackService.createFeedback(req.user, req.params.id, input);
  res.status(201).json(feedback);
});

export const getFeedbackHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const feedback = await feedbackService.getFeedbackForComplaint(req.user, req.params.id);
  res.json(feedback);
});

export const exportComplaintsHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Not authenticated");
  const filters = complaintFiltersSchema.parse(req.query);
  const complaints = await complaintsService.listComplaintsForExport(req.user, filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Complaints");
  sheet.columns = [
    { header: "Complaint #", key: "complaintNumber", width: 18 },
    { header: "Title", key: "title", width: 30 },
    { header: "Citizen", key: "citizen", width: 20 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "Category", key: "category", width: 18 },
    { header: "Ward", key: "ward", width: 14 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Assigned To", key: "assignedTo", width: 20 },
    { header: "Created", key: "createdAt", width: 20 },
    { header: "Resolved", key: "resolvedAt", width: 20 },
  ];
  complaints.forEach((c) => {
    sheet.addRow({
      complaintNumber: c.complaintNumber,
      title: c.title,
      citizen: c.citizen.name,
      phone: c.citizen.phone,
      category: c.category.name,
      ward: `Ward ${c.ward.wardNumber} — ${c.ward.name}`,
      priority: c.priority,
      status: c.status,
      assignedTo: c.assignedStaff?.name ?? "",
      createdAt: c.createdAt.toLocaleString(),
      resolvedAt: c.resolvedAt?.toLocaleString() ?? "",
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="complaints.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

export const citizenDashboardHandler = asyncHandler(async (req, res) => {
  if (!req.user || req.user.ownerType !== OwnerType.CITIZEN) {
    throw new AppError(403, "FORBIDDEN", "Citizens only");
  }
  const summary = await complaintsService.getCitizenDashboardSummary(req.user.sub);
  res.json(summary);
});
