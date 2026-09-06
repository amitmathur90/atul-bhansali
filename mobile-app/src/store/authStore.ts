import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
};

export interface CitizenProfile {
  id: string;
  name: string;
  phone: string;
  wardId: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
}

export interface StaffProfile {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: "STAFF" | "MLA" | "SUPER_ADMIN";
  designation?: string | null;
  linkedCitizenId?: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  ownerType: "CITIZEN" | "STAFF" | null;
  citizen: CitizenProfile | null;
  staff: StaffProfile | null;
  hasHydrated: boolean;
  setSession: (tokens: { accessToken: string; refreshToken: string }, citizen: CitizenProfile) => void;
  setStaffSession: (tokens: { accessToken: string; refreshToken: string }, staff: StaffProfile) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      ownerType: null,
      citizen: null,
      staff: null,
      hasHydrated: false,
      setSession: (tokens, citizen) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          ownerType: "CITIZEN",
          citizen,
          staff: null,
        }),
      setStaffSession: (tokens, staff) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          ownerType: "STAFF",
          staff,
          citizen: null,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ accessToken: null, refreshToken: null, ownerType: null, citizen: null, staff: null }),
    }),
    {
      name: "abc-mobile-auth",
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
