import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Footer } from "@/components/footer.tsx";
import { AppSidebar } from "@/components/app-sidebar.tsx";

export const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-screen">
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <main className="flex-1 p-4 overflow-auto">{children}</main>
        <Footer />
      </div>
    </SidebarProvider>
  </div>
);
