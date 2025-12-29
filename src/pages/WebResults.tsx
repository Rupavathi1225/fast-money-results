import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, LandingSettings } from "@/types/database";
import { trackClick, getIpInfo, generateRandomToken } from "@/lib/tracking";
import { getNextAllowedFallback } from "@/lib/fallbackAccess";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  blog_id: string | null;
}

interface Blog {
  id: string;
  title: string;
}

interface FallbackUrl {
  id: string;
  url: string;
  allowed_countries: string[];
  display_order: number;
}

// Generate random word-like token
const generateRandomWord = () => {
  const words = [
    "quick",
    "fast",
    "smart",
    "easy",
    "safe",
    "best",
    "top",
    "new",
    "pro",
    "max",
    "plus",
    "prime",
    "ultra",
    "mega",
    "super",
    "hyper",
    "elite",
    "apex",
    "peak",
    "core",
  ];
  return (
    words[Math.floor(Math.random() * words.length)] +
    generateRandomToken().substring(0, 4)
  );
};

const FALLBACK_CURSOR_KEY = "fm_fallback_cursor";

const WebResults = () => {
  const { wrPage } = useParams();
  const [searchParams] = useSearchParams();
  const fromBlog = searchParams.get("from"); // e.g., blog slug
  const resultId = searchParams.get("result_id"); // specific web result to show
  const pageNumber = parseInt(wrPage || "1");
  const [results, setResults] = useState<WebResult[]>([]);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [relatedSearch, setRelatedSearch] = useState<RelatedSearch | null>(null);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackUrls, setFallbackUrls] = useState<FallbackUrl[]>([]);
  const [userCountry, setUserCountry] = useState<string>("");

  useEffect(() => {
    fetchData();
    getUserCountry();
  }, [pageNumber, resultId]);

  const getUserCountry = async () => {
    const { country } = await getIpInfo();
    setUserCountry(country || "Unknown");
  };

  // Check if user's country is allowed for the *main* URL
  const isCountryAllowed = (
    allowedCountries: string[] | null,
    userCountryValue: string
  ): boolean => {
    // If no country restrictions, allow access (worldwide)
    if (!allowedCountries || allowedCountries.length === 0) return true;

    const normalizedUserCountry = userCountryValue.toLowerCase().trim();

    return allowedCountries.some((country) => {
      const normalizedAllowed = country.toLowerCase().trim();
      // Worldwide/All means accessible to everyone
      if (normalizedAllowed === "all" || normalizedAllowed === "worldwide") {
        return true;
      }
      // Exact match only (prevents Austria matching Australia)
      return normalizedAllowed === normalizedUserCountry;
    });
  };

  const redirectToNextAllowedFallback = () => {
    const last = parseInt(localStorage.getItem(FALLBACK_CURSOR_KEY) || "-1", 10);
    const { next, nextIndex } = getNextAllowedFallback(fallbackUrls, userCountry, last);

    if (!next) {
      const randomToken = generateRandomToken();
      window.location.href = `/q?t=${randomToken}&na=1`;
      return;
    }

    localStorage.setItem(FALLBACK_CURSOR_KEY, String(nextIndex));
    window.location.href = next.url;
  };

  useEffect(() => {
    if (blog) {
      document.title = `${blog.title} - Web Results`;
    } else if (relatedSearch) {
      document.title = `${relatedSearch.title} - Web Results`;
    } else {
      document.title = `Web Results - Page ${pageNumber}`;
    }
  }, [relatedSearch, blog, pageNumber]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // If result_id is provided, fetch only that specific result
      let resultsQuery = supabase
        .from('web_results')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (resultId) {
        resultsQuery = resultsQuery.eq('id', resultId);
      } else {
        resultsQuery = resultsQuery.eq('web_result_page', pageNumber);
      }

      const [settingsRes, resultsRes, relatedSearchRes, fallbackRes] = await Promise.all([
        supabase.from('landing_settings').select('*').single(),
        resultsQuery,
        supabase
          .from('related_searches')
          .select('id, title, search_text, web_result_page, blog_id')
          .eq('web_result_page', pageNumber)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('fallback_urls')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ]);

      if (fallbackRes.data) {
        setFallbackUrls(fallbackRes.data);
      }

      if (settingsRes.data) {
        setSettings(settingsRes.data as LandingSettings);
      }
      if (resultsRes.data) {
        setResults(resultsRes.data as WebResult[]);
        
        // If we have a single result, fetch related search and blog for that result
        if (resultId && resultsRes.data.length > 0) {
          const webResult = resultsRes.data[0] as WebResult;
          
          // Fetch related search for this web result's page
          const { data: relatedSearchData } = await supabase
            .from('related_searches')
            .select('id, title, search_text, web_result_page, blog_id')
            .eq('web_result_page', webResult.web_result_page)
            .eq('is_active', true)
            .maybeSingle();
          
          if (relatedSearchData) {
            setRelatedSearch(relatedSearchData as RelatedSearch);
            
            // Fetch blog from the related search's blog_id
            if (relatedSearchData.blog_id) {
              const { data: blogData } = await supabase
                .from('blogs')
                .select('id, title')
                .eq('id', relatedSearchData.blog_id)
                .maybeSingle();
              if (blogData) {
                setBlog(blogData);
              }
            }
          }
        }
      }
      if (!resultId && relatedSearchRes.data) {
        setRelatedSearch(relatedSearchRes.data as RelatedSearch);
        // Also fetch blog from related search if not already fetched
        if (relatedSearchRes.data.blog_id) {
          const { data: blogData } = await supabase
            .from('blogs')
            .select('id, title')
            .eq('id', relatedSearchRes.data.blog_id)
            .maybeSingle();
          if (blogData) {
            setBlog(blogData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMaskedLink = (result: WebResult, index: number) => {
    // Generate fully random parameters
    const p = generateRandomWord();
    const n = generateRandomToken();
    const c = generateRandomWord();
    return `/link/${generateRandomToken()}?p=${p}&n=${n}&c=${c}`;
  };

  const handleResultClick = async (result: WebResult, index: number) => {
    await trackClick(index + 1, result.id, window.location.href);

    // STEP 1: Check if main URL is allowed for user's country
    if (isCountryAllowed(result.country_permissions, userCountry)) {
      window.location.href = result.original_link;
      return;
    }

    // STEP 2: Main URL not allowed, go through fallback URLs in display_order sequence,
    // skipping any countries the user is not allowed to access.
    if (fallbackUrls.length > 0) {
      redirectToNextAllowedFallback();
    } else {
      const randomToken = generateRandomToken();
      window.location.href = `/q?t=${randomToken}&na=1`;
    }
  };

  const getLogoDisplay = (result: WebResult) => {
    if (result.logo_url) {
      return (
        <img 
          src={result.logo_url} 
          alt={result.title} 
          className="w-8 h-8 rounded object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const span = document.createElement('span');
              span.className = 'w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm';
              span.textContent = result.title.charAt(0).toUpperCase();
              parent.appendChild(span);
            }
          }}
        />
      );
    }
    return (
      <span className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
        {result.title.charAt(0).toUpperCase()}
      </span>
    );
  };

  // Generate random display URL for masking
  const getDisplayUrl = (index: number) => {
    const siteName = settings?.site_name?.toLowerCase() || 'fastmoney';
    return `${siteName}/${generateRandomWord()}/${generateRandomToken().substring(0, 4)}`;
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
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/landing" className="text-2xl font-display font-bold text-primary">
            {settings?.site_name || 'FastMoney'}
          </Link>
          <Link 
            to={fromBlog ? `/blog/${fromBlog}` : "/landing"} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {fromBlog ? 'Back to Blog' : 'Back to Search'}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Single Result Detail View */}
          {resultId && results.length > 0 && (
            <div className="mb-8 p-6 bg-secondary/30 rounded-lg border border-border/30">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Title:</span>
                  <p className="text-lg font-semibold text-foreground">{results[0].title}</p>
                </div>
                {blog && (
                  <div>
                    <span className="text-xs text-muted-foreground">Blog:</span>
                    <p className="text-primary">{blog.title}</p>
                  </div>
                )}
                {relatedSearch && (
                  <div>
                    <span className="text-xs text-muted-foreground">Related Search:</span>
                    <p className="text-foreground">{relatedSearch.title}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Original Link:</span>
                  <p className="text-primary break-all">{results[0].original_link}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Date:</span>
                  <p className="text-foreground">
                    {new Date(results[0].created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }).replace(/\//g, '/')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Blog Name and Related Search Title - only for non-single result view */}
          {!resultId && (blog || relatedSearch) && (
            <div className="mb-6">
              {blog && (
                <p className="text-sm text-primary mb-1">Blog: {blog.title}</p>
              )}
              {relatedSearch && (
                <>
                  <h1 className="text-2xl font-bold text-foreground">{relatedSearch.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing results for: {relatedSearch.search_text}
                  </p>
                </>
              )}
            </div>
          )}
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for this page.</p>
            </div>
          ) : (
            <>
              {/* Sponsored Results Section */}
              {results.filter(r => r.is_sponsored).length > 0 && (
                <div className="bg-[#1a1f2e] rounded-lg p-6 mb-8 border border-border/20">
                  {results.filter(r => r.is_sponsored).map((result, idx) => {
                    const originalIndex = results.findIndex(r => r.id === result.id);
                    const displayUrl = getDisplayUrl(originalIndex);
                    return (
                      <div
                        key={result.id}
                        className={`${idx > 0 ? 'mt-8 pt-8 border-t border-border/20' : ''}`}
                      >
                        <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">Sponsored</span>
                        <h3 
                          onClick={() => handleResultClick(result, originalIndex)}
                          className="text-lg font-medium text-[#8ab4f8] hover:underline cursor-pointer underline-offset-2 mt-2"
                        >
                          {result.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{displayUrl}</span>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground/80 mt-2 italic">
                            {result.description}
                          </p>
                        )}
                        <button
                          onClick={() => handleResultClick(result, originalIndex)}
                          className="mt-4 px-6 py-2.5 bg-[#2563eb] text-white font-medium rounded hover:bg-[#1d4ed8] transition-colors flex items-center gap-2"
                        >
                          <span>➤</span> Visit Website
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Regular Web Results */}
              {results.filter(r => !r.is_sponsored).length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">Web Results</p>
                  <div className="space-y-6">
                    {results.filter(r => !r.is_sponsored).map((result) => {
                      const originalIndex = results.findIndex(r => r.id === result.id);
                      const displayUrl = getDisplayUrl(originalIndex);
                      return (
                        <div
                          key={result.id}
                          onClick={() => handleResultClick(result, originalIndex)}
                          className="flex items-start gap-4 py-3 cursor-pointer group animate-fade-in"
                          style={{ animationDelay: `${originalIndex * 0.05}s` }}
                        >
                          <div className="flex-shrink-0">
                            {getLogoDisplay(result)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                              <span>{displayUrl}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                            <h3 className="text-lg font-medium text-primary group-hover:underline">
                              {result.title}
                            </h3>
                            {result.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default WebResults;
