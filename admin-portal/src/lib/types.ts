import type { ComplaintPriority, ComplaintStatus, ImageType } from "@abc/shared";

export interface Citizen {
  id: string;
  name: string;
  phone: string;
  isBlocked: boolean;
}

export interface ComplaintImage {
  id: string;
  url: string;
  type: ImageType;
  createdAt: string;
}

export interface ComplaintStatusHistoryEntry {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  remarks: string | null;
  changedByType: "CITIZEN" | "STAFF";
  changedById: string;
  createdAt: string;
}

export interface AssignedStaff {
  id: string;
  name: string;
  designation: string | null;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string;
  createdAt: string;
  resolvedAt: string | null;
  citizen: Citizen;
  category: { id: string; name: string };
  ward: { id: string; name: string; wardNumber: number };
  assignedStaff: AssignedStaff | null;
  images: ComplaintImage[];
  statusHistory?: ComplaintStatusHistoryEntry[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
