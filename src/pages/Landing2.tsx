import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIpInfo } from "@/lib/tracking";
import { getNextAllowedFallback } from "@/lib/fallbackAccess";

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

const FALLBACK_INDEX_KEY = "landing2_fallback_index";

const Landing2 = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
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
    // Only start auto-redirect if admin setting is enabled
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
          .select('redirect_enabled')
          .single(),
      ]);

      if (blogsRes.data) {
        setBlogs(blogsRes.data);
      }
      if (fallbackRes.data) {
        setFallbackUrls(fallbackRes.data);
      }
      if (settingsRes.data) {
        setRedirectEnabled(settingsRes.data.redirect_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFallbackRedirect = () => {
    // Get persisted index from localStorage
    const lastIndex = parseInt(localStorage.getItem(FALLBACK_INDEX_KEY) || "-1", 10);
    
    // Use the shared utility to get next allowed fallback
    const { next, nextIndex } = getNextAllowedFallback(fallbackUrls, userCountry, lastIndex);
    
    if (next) {
      // Save the new index for next time
      localStorage.setItem(FALLBACK_INDEX_KEY, nextIndex.toString());
      window.location.href = next.url;
    } else {
      // No fallback found for this country - show message or stay on page
      console.log("No fallback URL available for country:", userCountry);
    }
  };

  const handleBlogClick = (blog: Blog, index: number) => {
    hasClicked.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Navigate to the blog page using page_id
    window.location.href = `/blog/${blog.page_id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-pink-400 relative overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-yellow-400/60"
            style={{
              width: Math.random() * 8 + 3 + 'px',
              height: Math.random() * 8 + 3 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + 's',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-xl">
          {blogs.length === 0 ? (
            <div className="text-center text-white text-lg">
              No content available
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {blogs.map((blog, index) => (
                <button
                  key={blog.id}
                  onClick={() => handleBlogClick(blog, index)}
                  className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-left hover:bg-white/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <span className="text-base font-medium">{blog.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
};

export default Landing2;
