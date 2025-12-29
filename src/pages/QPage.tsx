import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getIpInfo, generateSessionId, getDeviceType } from "@/lib/tracking";
import { getNextAllowedFallback } from "@/lib/fallbackAccess";

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

// Track landing2 page view
const trackLanding2View = async (sessionId: string, ipAddress: string, country: string, deviceType: string) => {
  try {
    await supabase.from('landing2_tracking').insert({
      session_id: sessionId,
      ip_address: ipAddress,
      country: country,
      device_type: deviceType,
      user_agent: navigator.userAgent,
      event_type: 'view',
    });
  } catch (error) {
    console.error('Error tracking landing2 view:', error);
  }
};

// Track landing2 blog click
const trackLanding2Click = async (sessionId: string, ipAddress: string, country: string, deviceType: string) => {
  try {
    await supabase.from('landing2_tracking').insert({
      session_id: sessionId,
      ip_address: ipAddress,
      country: country,
      device_type: deviceType,
      user_agent: navigator.userAgent,
      event_type: 'click',
    });
  } catch (error) {
    console.error('Error tracking landing2 click:', error);
  }
};

// Track fallback URL click
const trackFallbackClick = async (sessionId: string, ipAddress: string, country: string, deviceType: string, fallbackUrlId: string) => {
  try {
    await supabase.from('landing2_tracking').insert({
      session_id: sessionId,
      ip_address: ipAddress,
      country: country,
      device_type: deviceType,
      user_agent: navigator.userAgent,
      event_type: 'fallback_click',
      fallback_url_id: fallbackUrlId,
    });
  } catch (error) {
    console.error('Error tracking fallback click:', error);
  }
};

const QPage = () => {
  const [searchParams] = useSearchParams();
  const notAvailable = searchParams.get('na') === '1';
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [fallbackUrls, setFallbackUrls] = useState<FallbackUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>("");
  const [ipAddress, setIpAddress] = useState<string>("");
  const [showNotAvailable, setShowNotAvailable] = useState(notAvailable);
  const hasClicked = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    fetchData();
    getUserCountryAndTrackView();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && fallbackUrls.length > 0 && userCountry) {
      // Start 5-second timer for auto-redirect
      timerRef.current = setTimeout(() => {
        if (!hasClicked.current) {
          startFallbackRedirects();
        }
      }, 5000);
    }
  }, [loading, fallbackUrls, userCountry]);

  const getUserCountryAndTrackView = async () => {
    const { country, ipAddress: ip } = await getIpInfo();
    setUserCountry(country || "Unknown");
    setIpAddress(ip || "");
    
    // Track view once
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      const sessionId = generateSessionId();
      const deviceType = getDeviceType();
      await trackLanding2View(sessionId, ip, country, deviceType);
    }
  };

  const fetchData = async () => {
    try {
      const [blogsRes, fallbackRes] = await Promise.all([
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
      ]);

      if (blogsRes.data) {
        setBlogs(blogsRes.data);
      }
      if (fallbackRes.data) {
        setFallbackUrls(fallbackRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFallbackRedirects = async () => {
    const sessionId = generateSessionId();
    const deviceType = getDeviceType();

    const last = parseInt(localStorage.getItem("fm_fallback_cursor") || "-1", 10);
    const { next, nextIndex } = getNextAllowedFallback(fallbackUrls, userCountry, last);

    if (!next) {
      setShowNotAvailable(true);
      return;
    }

    localStorage.setItem("fm_fallback_cursor", String(nextIndex));
    await trackFallbackClick(sessionId, ipAddress, userCountry, deviceType, next.id);
    window.location.href = next.url;
  };

  const handleBlogClick = async (blog: Blog, index: number) => {
    hasClicked.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Track the click
    const sessionId = generateSessionId();
    const deviceType = getDeviceType();
    await trackLanding2Click(sessionId, ipAddress, userCountry, deviceType);
    
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

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-xl">
          {showNotAvailable ? (
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-8 mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Link Not Available</h2>
                <p className="text-white/80">This link is not available in your region.</p>
              </div>
              <p className="text-white/60 text-sm">Explore other options below:</p>
            </div>
          ) : null}
          
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

export default QPage;
