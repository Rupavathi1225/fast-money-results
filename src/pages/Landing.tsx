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
          .order('display_order', { ascending: true }),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data as LandingSettings);
      }
      if (searchesRes.data) {
        setSearches(searchesRes.data as RelatedSearch[]);
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

            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {searches.map((search, index) => (
                <button
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="search-box text-left group w-full"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                    {search.search_text}
                  </span>
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
