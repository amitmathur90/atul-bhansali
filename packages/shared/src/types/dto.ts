export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// The 13 complaint categories named explicitly in the PRD — seeded verbatim at DB setup time.
export const PRD_COMPLAINT_CATEGORIES = [
  "Water Supply",
  "Road",
  "Drainage",
  "Electricity",
  "Garbage",
  "Street Light",
  "Government Scheme",
  "Education",
  "Hospital",
  "Women Safety",
  "Traffic",
  "Public Transport",
  "Others",
] as const;
