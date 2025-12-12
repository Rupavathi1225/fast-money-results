import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, LandingSettings } from "@/types/database";
import { trackClick } from "@/lib/tracking";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
}

const WebResults = () => {
  const { wrPage } = useParams();
  const pageNumber = parseInt(wrPage || '1');
  const [results, setResults] = useState<WebResult[]>([]);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [relatedSearch, setRelatedSearch] = useState<RelatedSearch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [pageNumber]);

  useEffect(() => {
    if (relatedSearch) {
      document.title = `${relatedSearch.title} - Web Results`;
    } else {
      document.title = `Web Results - Page ${pageNumber}`;
    }
  }, [relatedSearch, pageNumber]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, resultsRes, relatedSearchRes] = await Promise.all([
        supabase.from('landing_settings').select('*').single(),
        supabase
          .from('web_results')
          .select('*')
          .eq('web_result_page', pageNumber)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('related_searches')
          .select('id, title, search_text, web_result_page')
          .eq('web_result_page', pageNumber)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as LandingSettings);
      }
      if (resultsRes.data) {
        setResults(resultsRes.data as WebResult[]);
      }
      if (relatedSearchRes.data) {
        setRelatedSearch(relatedSearchRes.data as RelatedSearch);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: WebResult, index: number) => {
    await trackClick(index + 1, result.id, window.location.href);
    window.location.href = `/link/${index + 1}?rid=${result.id}`;
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
            to="/landing" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Related Search Title */}
          {relatedSearch && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{relatedSearch.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Showing results for: {relatedSearch.search_text}
              </p>
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
                          <span>{settings?.site_name?.toLowerCase() || 'fastmoney'}/link/{originalIndex + 1}</span>
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
                              <span>{settings?.site_name?.toLowerCase() || 'fastmoney'}/link/{originalIndex + 1}</span>
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
