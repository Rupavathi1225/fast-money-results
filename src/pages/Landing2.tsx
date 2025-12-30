import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getIpInfo } from "@/lib/tracking";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

interface FallbackUrl {
  id: string;
  url: string;
  allowed_countries: string[];
  display_order: number;
}

const Landing2 = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [fallbackUrls, setFallbackUrls] = useState<FallbackUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>("");
  const [adminRedirectEnabled, setAdminRedirectEnabled] = useState(false);
  const [localRedirectToggle, setLocalRedirectToggle] = useState(true); // Default ON
  const hasClicked = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIndexRef = useRef(0);

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
    // Only start auto-redirect if BOTH admin setting AND local toggle are enabled
    if (!loading && fallbackUrls.length > 0 && userCountry && adminRedirectEnabled && localRedirectToggle) {
      timerRef.current = setTimeout(() => {
        if (!hasClicked.current) {
          startFallbackRedirects();
        }
      }, 5000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [loading, fallbackUrls, userCountry, adminRedirectEnabled, localRedirectToggle]);

  const getUserCountry = async () => {
    const { country } = await getIpInfo();
    // Get country code from country name or use the returned value
    setUserCountry(country || "Unknown");
  };

  const fetchData = async () => {
    try {
      const [blogsRes, fallbackRes, settingsRes] = await Promise.all([
        supabase
          .from('blogs')
          .select('id, title, slug')
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
        setAdminRedirectEnabled(settingsRes.data.redirect_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCountryAllowed = (allowedCountries: string[], userCountry: string): boolean => {
    if (!allowedCountries || allowedCountries.length === 0) return true;
    
    const normalizedUserCountry = userCountry.toLowerCase().trim();
    
    return allowedCountries.some(country => {
      const normalizedAllowed = country.toLowerCase().trim();
      // Check for ALL/worldwide first
      if (normalizedAllowed === 'all' || normalizedAllowed === 'worldwide') {
        return true;
      }
      // Check for exact or partial country match
      return normalizedAllowed === normalizedUserCountry ||
             normalizedUserCountry.includes(normalizedAllowed) ||
             normalizedAllowed.includes(normalizedUserCountry);
    });
  };

  const startFallbackRedirects = () => {
    const tryNextUrl = () => {
      while (fallbackIndexRef.current < fallbackUrls.length) {
        const currentUrl = fallbackUrls[fallbackIndexRef.current];
        fallbackIndexRef.current++;

        if (isCountryAllowed(currentUrl.allowed_countries, userCountry)) {
          // Open this URL
          window.location.href = currentUrl.url;
          return;
        }
        // Country not allowed, try next URL
      }
      
      // If all URLs exhausted, reset and try again with worldwide only
      fallbackIndexRef.current = 0;
      for (const url of fallbackUrls) {
        if (url.allowed_countries.some(c => c.toLowerCase() === 'worldwide')) {
          window.location.href = url.url;
          return;
        }
      }
    };

    tryNextUrl();
  };

  const handleBlogClick = (blog: Blog, index: number) => {
    hasClicked.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Navigate to the blog page
    window.location.href = `/blog/${blog.slug}`;
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

      {/* Redirect Toggle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
        <span className="text-white/80 text-sm">Auto Redirect</span>
        <button
          onClick={() => setLocalRedirectToggle(!localRedirectToggle)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            localRedirectToggle ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
              localRedirectToggle ? 'left-7' : 'left-1'
            }`}
          />
        </button>
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
