import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export interface Category {
  id: string;
  name: string;
}

export interface Ward {
  id: string;
  wardNumber: number;
  name: string;
  city: string;
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
