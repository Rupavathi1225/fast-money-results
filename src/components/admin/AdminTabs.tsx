import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";

const AdminTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/adm' || location.pathname === '/adm/') return 'landing';
    if (location.pathname.includes('/adm/categories')) return 'categories';
    if (location.pathname.includes('/adm/webresults')) return 'webresults';
    if (location.pathname.includes('/adm/prelander')) return 'prelander';
    if (location.pathname.includes('/adm/blogs')) return 'blogs';
    if (location.pathname.includes('/adm/analytics')) return 'analytics';
    if (location.pathname.includes('/adm/bulk-web-result-editor')) return 'bulk';
    if (location.pathname.includes('/adm/fallback-urls')) return 'fallback';
    return 'landing';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'landing':
        navigate('/adm');
        break;
      case 'categories':
        navigate('/adm/categories');
        break;
      case 'webresults':
        navigate('/adm/webresults');
        break;
      case 'prelander':
        navigate('/adm/prelander');
        break;
      case 'blogs':
        navigate('/adm/blogs');
        break;
      case 'analytics':
        navigate('/adm/analytics');
        break;
      case 'bulk':
        navigate('/adm/bulk-web-result-editor');
        break;
      case 'fallback':
        navigate('/adm/fallback-urls');
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
