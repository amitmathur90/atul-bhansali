import cors from "cors";
import express from "express";
import path from "node:path";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { announcementsRouter } from "./modules/announcements/announcements.routes";
import { appointmentsRouter } from "./modules/appointments/appointments.routes";
import { candidateAnnouncementsRouter } from "./modules/campaign/candidate-announcements.routes";
import { campaignPostsRouter } from "./modules/campaign/campaign-posts.routes";
import { campaignEventsRouter } from "./modules/campaign/campaign-events.routes";
import { campaignFeedbackRouter } from "./modules/campaign/campaign-feedback.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { citizensRouter } from "./modules/citizens/citizens.routes";
import { complaintsRouter } from "./modules/complaints/complaints.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { departmentsRouter } from "./modules/departments/departments.routes";
import { developmentProjectsRouter } from "./modules/development-projects/development-projects.routes";
import { emergencyContactsRouter } from "./modules/emergency-contacts/emergency-contacts.routes";
import { feedbackRouter } from "./modules/feedback/feedback.routes";
import { commentsRouter } from "./modules/feed/comments.routes";
import { followsRouter } from "./modules/feed/follows.routes";
import { postsRouter } from "./modules/feed/posts.routes";
import { profileRouter } from "./modules/feed/profile.routes";
import { commentReportsAdminRouter, postReportCreateRouter, postReportsAdminRouter } from "./modules/feed/reports.routes";
import { verificationRouter } from "./modules/feed/verification.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { staffRouter } from "./modules/staff/staff.routes";
import { wardsRouter } from "./modules/wards/wards.routes";
import { welfareSchemesRouter } from "./modules/welfare-schemes/welfare-schemes.routes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV, time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/wards", wardsRouter);
app.use("/api/staff", staffRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/development-projects", developmentProjectsRouter);
app.use("/api/emergency-contacts", emergencyContactsRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/citizens", followsRouter);
app.use("/api/citizens", profileRouter);
app.use("/api/citizens", citizensRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/welfare-schemes", welfareSchemesRouter);
app.use("/api/candidate-announcements", candidateAnnouncementsRouter);
app.use("/api/campaign-posts", campaignPostsRouter);
app.use("/api/campaign-events", campaignEventsRouter);
app.use("/api/campaign-feedback", campaignFeedbackRouter);
app.use("/api/posts/:postId/comments", commentsRouter);
app.use("/api/posts/:postId/report", postReportCreateRouter);
app.use("/api/post-reports", postReportsAdminRouter);
app.use("/api/comment-reports", commentReportsAdminRouter);
app.use("/api/posts", postsRouter);
app.use("/api/verification-requests", verificationRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use(errorMiddleware);
