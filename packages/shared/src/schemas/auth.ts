import { z } from "zod";

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
  name: z.string().min(2).max(100).optional(),
  wardId: z.string().uuid().optional(),
  address: z.string().min(3).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

export const staffLoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
