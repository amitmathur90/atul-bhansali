import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export interface Category {
  id: string;
  name: string;
  departmentId: string;
  department?: { id: string; name: string };
}

export interface Ward {
  id: string;
  wardNumber: number;
  name: string;
  city: string;
}

export interface StaffOption {
  id: string;
  name: string;
  username: string;
  designation: string | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get<{ items: Category[] }>("/categories")).data.items,
  });
}

export function useWards() {
  return useQuery({
    queryKey: ["wards"],
    queryFn: async () => (await apiClient.get<{ items: Ward[] }>("/wards")).data.items,
  });
}

export function useStaffOptions() {
  return useQuery({
    queryKey: ["staff-options"],
    queryFn: async () => (await apiClient.get<{ items: StaffOption[] }>("/staff")).data.items,
  });
}

export interface Department {
  id: string;
  name: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await apiClient.get<{ items: Department[] }>("/departments")).data.items,
  });
}
