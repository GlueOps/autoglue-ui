import { ThemeProvider } from "@/providers/theme-provider.tsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/auth/login.tsx";
import { AuthProvider } from "@/providers/auth-provider.tsx";
import { Toaster } from "@/components/ui/sonner";
import { ProtectedRoute } from "@/components/protected-route.tsx";
import { DashboardLayout } from "@/layouts/dashboard-layout.tsx";
import { NotFoundPage } from "@/pages/error/not-found.tsx";
import { ClusterListPage } from "@/elements/cluster-list.tsx";
import { OrgManagement } from "@/pages/settings/orgs/org-management.tsx";
import { MemberManagement } from "@/pages/settings/orgs/member-management.tsx";
import { SshKeysPage } from "@/pages/security/ssh.tsx";
import { ServersPage } from "@/pages/core/servers.tsx";

export const App = () => (
  <AuthProvider>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/core/cluster" element={<ClusterListPage />} />
                    <Route path="/core/servers" element={<ServersPage />} />
                    <Route path="/security/ssh" element={<SshKeysPage />} />
                    <Route path="/settings/orgs" element={<OrgManagement />} />
                    <Route
                      path="/settings/members"
                      element={<MemberManagement />}
                    />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" expand richColors />
    </ThemeProvider>
  </AuthProvider>
);
