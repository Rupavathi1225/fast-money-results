import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Search, 
  Globe, 
  BarChart3, 
  Settings,
  Home
} from "lucide-react";

const AdminSidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Landing Page', path: '/admin' },
    { icon: Search, label: 'Categories', path: '/admin/categories' },
    { icon: Globe, label: 'Web Results', path: '/admin/webresults' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-screen">
      <div className="p-6">
        <h1 className="text-xl font-display font-bold text-primary">
          Admin Panel
        </h1>
      </div>
      
      <nav className="px-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            activeClassName="bg-sidebar-accent text-primary"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        <div className="pt-6 mt-6 border-t border-sidebar-border">
          <NavLink
            to="/landing"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>View Site</span>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
