import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingSettings, RelatedSearch } from "@/types/database";
import { trackRelatedSearchClick } from "@/lib/tracking";

const Landing = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, searchesRes] = await Promise.all([
        supabase.from('landing_settings').select('*').single(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .in('web_result_page', [1, 2, 3, 4])
          .order('web_result_page', { ascending: true })
          .order('display_order', { ascending: true }),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as LandingSettings);
      }
      if (searchesRes.data) {
        // Get first search from each web_result_page (1, 2, 3, 4)
        const allSearches = searchesRes.data as RelatedSearch[];
        const uniquePageSearches: RelatedSearch[] = [];
        const seenPages = new Set<number>();
        
        for (const search of allSearches) {
          if (!seenPages.has(search.web_result_page) && uniquePageSearches.length < 4) {
            uniquePageSearches.push(search);
            seenPages.add(search.web_result_page);
          }
        }
        setSearches(uniquePageSearches);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = async (search: RelatedSearch) => {
    // Track the related search click
    await trackRelatedSearchClick(search.id);
    navigate(`/wr/${search.web_result_page}`);
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
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-display font-bold text-primary">
            {settings?.site_name || 'FastMoney'}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6 animate-fade-in">
            {settings?.title || 'Fast Money Solutions'}
          </h2>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up">
            {settings?.description || 'Discover the best platforms for earning money online.'}
          </p>

          {/* Related Searches */}
          <div className="mt-16">
            <h3 className="text-xl font-display font-semibold text-foreground mb-8">
              Related Searches
            </h3>

            <div className="flex flex-col gap-2 max-w-2xl mx-auto">
              {searches.map((search, index) => (
                <button
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="flex items-center justify-between px-4 py-3 border border-border/60 hover:border-primary/50 rounded-md text-primary hover:text-primary/80 transition-all duration-200 group w-full"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-sm">{search.search_text}</span>
                  <svg className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Landing;
