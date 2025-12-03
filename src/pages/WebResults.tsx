import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, LandingSettings } from "@/types/database";
import { trackClick } from "@/lib/tracking";
import { ArrowLeft, ExternalLink } from "lucide-react";

const WebResults = () => {
  const [searchParams] = useSearchParams();
  const wrPage = parseInt(searchParams.get('wr') || '1');
  const [results, setResults] = useState<WebResult[]>([]);
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [wrPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, resultsRes] = await Promise.all([
        supabase.from('landing_settings').select('*').single(),
        supabase
          .from('web_results')
          .select('*')
          .eq('web_result_page', wrPage)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as LandingSettings);
      }
      if (resultsRes.data) {
        setResults(resultsRes.data as WebResult[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: WebResult, index: number) => {
    // Track the click
    await trackClick(index + 1, result.id, window.location.href);
    
    // Navigate to the link redirect page
    window.location.href = `/lid=${index + 1}?rid=${result.id}`;
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
          <h2 className="text-sm text-muted-foreground mb-8">
            Web Results - Page {wrPage}
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for this page.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result, index)}
                  className="web-result-item animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getLogoDisplay(result)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{settings?.site_name?.toLowerCase() || 'fastmoney'}/lid={index + 1}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                    <h3 className="text-lg font-medium text-primary hover:underline cursor-pointer">
                      {result.title}
                    </h3>
                    {result.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination hint */}
          <div className="mt-12 pt-6 border-t border-border/30">
            <p className="text-sm text-muted-foreground text-center">
              Showing results from page {wrPage}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WebResults;
