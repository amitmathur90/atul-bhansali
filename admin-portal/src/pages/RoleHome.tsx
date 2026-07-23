import { StaffRole } from "@abc/shared";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RoleHome() {
  const staff = useAuthStore((s) => s.staff);
  return <Navigate to={staff?.role === StaffRole.STAFF ? "/my-complaints" : "/dashboard"} replace />;
}
