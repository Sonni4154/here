import { ReactNode } from "react";
import RoleBasedNavigation from "./role-based-navigation";
import Header from "./header";
import { useRouteTitle } from "@/hooks/useRouter";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pageTitle = useRouteTitle();

  return (
    <div className="flex h-screen bg-background">
      <RoleBasedNavigation />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={pageTitle} />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}