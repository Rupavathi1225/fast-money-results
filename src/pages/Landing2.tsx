import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getIpInfo } from "@/lib/tracking";
import { getNextAllowedFallback } from "@/lib/fallbackAccess";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  page_id: number | null;
}

interface FallbackUrl {
  id: string;
  url: string;
  allowed_countries: string[];
  display_order: number;
}

interface LandingSettings {
  site_name: string;
  redirect_enabled: boolean;
}

const FALLBACK_INDEX_KEY = "landing2_fallback_index";

const Landing2 = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [fallbackUrls, setFallbackUrls] = useState<FallbackUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>("");
  const [redirectEnabled, setRedirectEnabled] = useState(false);
  const hasClicked = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    getUserCountry();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && fallbackUrls.length > 0 && userCountry && redirectEnabled) {
      timerRef.current = setTimeout(() => {
        if (!hasClicked.current) {
          startFallbackRedirect();
        }
      }, 5000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [loading, fallbackUrls, userCountry, redirectEnabled]);

  const getUserCountry = async () => {
    const { country } = await getIpInfo();
    setUserCountry(country || "Unknown");
  };

  const fetchData = async () => {
    try {
      const [blogsRes, fallbackRes, settingsRes] = await Promise.all([
        supabase
          .from('blogs')
          .select('id, title, page_id')
          .eq('status', 'published')
          .order('created_at', { ascending: true })
          .limit(5),
        supabase
          .from('fallback_urls')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('landing_settings')
          .select('site_name, redirect_enabled')
          .single(),
      ]);

      if (blogsRes.data) {
        setBlogs(blogsRes.data);
      }
      if (fallbackRes.data) {
        setFallbackUrls(fallbackRes.data);
      }
      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setRedirectEnabled(settingsRes.data.redirect_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFallbackRedirect = () => {
    const lastIndex = parseInt(localStorage.getItem(FALLBACK_INDEX_KEY) || "-1", 10);
    const { next, nextIndex } = getNextAllowedFallback(fallbackUrls, userCountry, lastIndex);
    
    if (next) {
      localStorage.setItem(FALLBACK_INDEX_KEY, nextIndex.toString());
      window.location.href = next.url;
    } else {
      console.log("No fallback URL available for country:", userCountry);
    }
  };

  const handleBlogClick = (blog: Blog) => {
    hasClicked.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    window.location.href = `/blog/${blog.page_id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/landing"
            className="inline-flex items-center gap-3 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xl font-semibold">
              {settings?.site_name || 'FastMoney'}
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        {blogs.length === 0 ? (
          <div className="text-center text-muted-foreground text-lg">
            No content available
          </div>
        ) : (
          <>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-6">
              Related Searches
            </h2>
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {blogs.map((blog) => (
                <button
                  key={blog.id}
                  onClick={() => handleBlogClick(blog)}
                  className="flex items-center justify-between px-5 py-4 border border-border hover:border-primary/50 rounded-md text-primary hover:bg-secondary/30 transition-all duration-200 group w-full"
                >
                  <span className="text-base">{blog.title}</span>
                  <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Landing2;