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
  const [redirectEnabled, setRedirectEnabled] = useState(false);
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
    // Only start auto-redirect if redirect is enabled in admin settings
    if (!loading && fallbackUrls.length > 0 && userCountry && redirectEnabled) {
      // Start 5-second timer for auto-redirect
      timerRef.current = setTimeout(() => {
        if (!hasClicked.current) {
          startFallbackRedirects();
        }
      }, 5000);
    }
  }, [loading, fallbackUrls, userCountry, redirectEnabled]);

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
        setRedirectEnabled(settingsRes.data.redirect_enabled || false);
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
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="animate-pulse text-emerald-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-emerald-500">
            OfferGrabZone
          </h1>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Grab Hot Deals Faster
          </h2>

          {/* Description */}
          <p className="text-gray-400 mb-12 max-w-xl mx-auto">
            Finding great offers is all OfferGrabZone helps users spot trending deals, hidden discounts, and limited-time steals before they disappear.
          </p>

          {showNotAvailable && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Link Not Available</h3>
              <p className="text-gray-400">This link is not available in your region.</p>
            </div>
          )}

          {/* Related Searches */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-wider">
              Related Searches
            </h3>

            {blogs.length === 0 ? (
              <div className="text-gray-400">
                No content available
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-xl mx-auto">
                {blogs.map((blog, index) => (
                  <button
                    key={blog.id}
                    onClick={() => handleBlogClick(blog, index)}
                    className="flex items-center justify-between px-5 py-4 bg-transparent border border-emerald-500/40 hover:border-emerald-500 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all duration-200 group w-full"
                  >
                    <span className="text-sm font-medium">{blog.title}</span>
                    <svg className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-6 text-center">
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} OfferGrabZone. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default QPage;
