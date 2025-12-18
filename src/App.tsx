import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import WebResults from "./pages/WebResults";
import LinkRedirect from "./pages/LinkRedirect";
import Prelander from "./pages/Prelander";
import BlogPage from "./pages/BlogPage";
import BlogRedirect from "./pages/BlogRedirect";
import AdminLanding from "./pages/admin/AdminLanding";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminWebResults from "./pages/admin/AdminWebResults";
import AdminPrelander from "./pages/admin/AdminPrelander";
import AdminBlogs from "./pages/admin/AdminBlogs";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/wr/:wrPage" element={<WebResults />} />
          <Route path="/link/:linkId" element={<LinkRedirect />} />
          <Route path="/prelander" element={<Prelander />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          <Route path="/p/:pageId" element={<BlogRedirect />} />
          <Route path="/admin" element={<AdminLanding />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/webresults" element={<AdminWebResults />} />
          <Route path="/admin/prelander" element={<AdminPrelander />} />
          <Route path="/admin/blogs" element={<AdminBlogs />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
