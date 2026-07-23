import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { otpRequestLimiter } from "../../middleware/rateLimit.middleware";
import * as authController from "./auth.controller";

export const authRouter = Router();

authRouter.post("/otp/request", otpRequestLimiter, authController.requestOtpHandler);
authRouter.post("/otp/verify", authController.verifyOtpHandler);
authRouter.post("/staff/login", authController.staffLoginHandler);
authRouter.post("/refresh", authController.refreshHandler);
authRouter.post("/logout", authController.logoutHandler);
authRouter.get("/me", requireAuth, authController.meHandler);
