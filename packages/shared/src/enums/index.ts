// Mirrors the enums declared in backend/prisma/schema.prisma — keep both in sync.

export const StaffRole = {
  STAFF: "STAFF",
  MLA: "MLA",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const ComplaintStatus = {
  RECEIVED: "RECEIVED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

export const ComplaintPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EMERGENCY: "EMERGENCY",
} as const;
export type ComplaintPriority = (typeof ComplaintPriority)[keyof typeof ComplaintPriority];

export const ImageType = {
  CITIZEN_UPLOAD: "CITIZEN_UPLOAD",
  STAFF_WORK_PHOTO: "STAFF_WORK_PHOTO",
} as const;
export type ImageType = (typeof ImageType)[keyof typeof ImageType];

export const AnnouncementType = {
  DEVELOPMENT_PROJECT: "DEVELOPMENT_PROJECT",
  EMERGENCY_NOTICE: "EMERGENCY_NOTICE",
  GOVT_SCHEME: "GOVT_SCHEME",
  EVENT: "EVENT",
  BLOOD_DONATION: "BLOOD_DONATION",
  HEALTH_CAMP: "HEALTH_CAMP",
  EMPLOYMENT_NEWS: "EMPLOYMENT_NEWS",
} as const;
export type AnnouncementType = (typeof AnnouncementType)[keyof typeof AnnouncementType];

export const DevProjectCategory = {
  ROAD: "ROAD",
  SCHOOL: "SCHOOL",
  HOSPITAL: "HOSPITAL",
  WATER: "WATER",
  PARK: "PARK",
  OTHER: "OTHER",
} as const;
export type DevProjectCategory = (typeof DevProjectCategory)[keyof typeof DevProjectCategory];

export const DevProjectStatus = {
  PLANNED: "PLANNED",
  ONGOING: "ONGOING",
  COMPLETED: "COMPLETED",
} as const;
export type DevProjectStatus = (typeof DevProjectStatus)[keyof typeof DevProjectStatus];

export const EmergencyContactCategory = {
  POLICE: "POLICE",
  FIRE: "FIRE",
  AMBULANCE: "AMBULANCE",
  WATER_DEPT: "WATER_DEPT",
  ELECTRICITY_DEPT: "ELECTRICITY_DEPT",
  MLA_OFFICE: "MLA_OFFICE",
  OTHER: "OTHER",
} as const;
export type EmergencyContactCategory =
  (typeof EmergencyContactCategory)[keyof typeof EmergencyContactCategory];

export const NotificationType = {
  STATUS_CHANGE: "STATUS_CHANGE",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  EMERGENCY: "EMERGENCY",
  MEETING: "MEETING",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const RecipientType = {
  CITIZEN: "CITIZEN",
  STAFF: "STAFF",
} as const;
export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType];

// Generic owner/actor discriminator used by auth (refresh tokens, device tokens) and
// audit tables, since citizens and staff live in two separate tables (see build plan).
export const OwnerType = {
  CITIZEN: "CITIZEN",
  STAFF: "STAFF",
} as const;
export type OwnerType = (typeof OwnerType)[keyof typeof OwnerType];

export const OtpPurpose = {
  REGISTRATION: "REGISTRATION",
  LOGIN: "LOGIN",
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export const DevicePlatform = {
  ANDROID: "ANDROID",
  IOS: "IOS",
} as const;
export type DevicePlatform = (typeof DevicePlatform)[keyof typeof DevicePlatform];

export const AppointmentStatus = {
  PENDING: "PENDING",
  SCHEDULED: "SCHEDULED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

// Allowed status transitions for the complaint workflow.
export const COMPLAINT_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
};

// Allowed status transitions for the appointment workflow.
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["SCHEDULED", "REJECTED", "CANCELLED"],
  SCHEDULED: ["COMPLETED", "CANCELLED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};
