import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminTabs from "./AdminTabs";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground">Admin Panel</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/landing" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              View Site
            </Link>
          </Button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="container mx-auto px-4 py-4">
        <AdminTabs />
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
