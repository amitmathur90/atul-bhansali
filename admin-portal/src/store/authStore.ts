import type { StaffRole } from "@abc/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StaffProfile {
  id: string;
  name: string;
  username: string;
  role: StaffRole;
  designation?: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  staff: StaffProfile | null;
  setSession: (tokens: { accessToken: string; refreshToken: string }, staff: StaffProfile) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      staff: null,
      setSession: (tokens, staff) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, staff }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ accessToken: null, refreshToken: null, staff: null }),
    }),
    { name: "abc-admin-auth" },
  ),
);
