import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";

const AdminTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') return 'landing';
    if (location.pathname.includes('/admin/categories')) return 'categories';
    if (location.pathname.includes('/admin/webresults')) return 'webresults';
    if (location.pathname.includes('/admin/prelander')) return 'prelander';
    if (location.pathname.includes('/admin/blogs')) return 'blogs';
    if (location.pathname.includes('/admin/analytics')) return 'analytics';
    if (location.pathname.includes('/admin/bulk-web-result-editor')) return 'bulk';
    if (location.pathname.includes('/admin/fallback-urls')) return 'fallback';
    return 'landing';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'landing':
        navigate('/admin');
        break;
      case 'categories':
        navigate('/admin/categories');
        break;
      case 'webresults':
        navigate('/admin/webresults');
        break;
      case 'prelander':
        navigate('/admin/prelander');
        break;
      case 'blogs':
        navigate('/admin/blogs');
        break;
      case 'analytics':
        navigate('/admin/analytics');
        break;
      case 'bulk':
        navigate('/admin/bulk-web-result-editor');
        break;
      case 'fallback':
        navigate('/admin/fallback-urls');
        break;
    }
  };

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full justify-center bg-muted/50 h-12 flex-wrap">
        <TabsTrigger value="landing" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Landing Content
        </TabsTrigger>
        <TabsTrigger value="categories" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Search Buttons
        </TabsTrigger>
        <TabsTrigger value="webresults" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Web Results
        </TabsTrigger>
        <TabsTrigger value="prelander" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Page Builder
        </TabsTrigger>
        <TabsTrigger value="blogs" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Blogs
        </TabsTrigger>
        <TabsTrigger value="analytics" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Analytics
        </TabsTrigger>
        <TabsTrigger value="bulk" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Bulk Editor
        </TabsTrigger>
        <TabsTrigger value="fallback" className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Fallback URLs
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default AdminTabs;
