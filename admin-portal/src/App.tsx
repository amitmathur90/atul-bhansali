import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { queryClient } from "./lib/query-client";
import { AnnouncementsPage } from "./pages/Announcements/AnnouncementsPage";
import { AppointmentsPage } from "./pages/Appointments/AppointmentsPage";
import { LoginPage } from "./pages/Auth/LoginPage";
import { CitizensPage } from "./pages/Citizens/CitizensPage";
import { ComplaintDetailPage } from "./pages/Complaints/ComplaintDetailPage";
import { ComplaintsListPage } from "./pages/Complaints/ComplaintsListPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { DevelopmentProjectsPage } from "./pages/DevelopmentProjects/DevelopmentProjectsPage";
import { EmergencyContactsPage } from "./pages/EmergencyContacts/EmergencyContactsPage";
import { LookupsPage } from "./pages/Lookups/LookupsPage";
import { ReportsPage } from "./pages/Reports/ReportsPage";
import { RoleHome } from "./pages/RoleHome";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { StaffPage } from "./pages/Staff/StaffPage";
import { WelfareSchemesPage } from "./pages/WelfareSchemes/WelfareSchemesPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<RoleHome />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/complaints" element={<ComplaintsListPage title="Complaints" />} />
            <Route path="/my-complaints" element={<ComplaintsListPage title="My Complaints" />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/citizens" element={<CitizensPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/development-projects" element={<DevelopmentProjectsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/welfare-schemes" element={<WelfareSchemesPage />} />
            <Route path="/emergency-contacts" element={<EmergencyContactsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/lookups" element={<LookupsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
