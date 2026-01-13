import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingSettings, RelatedSearch } from "@/types/database";
import { trackRelatedSearchClick } from "@/lib/tracking";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
      <header className="py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/"
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
        <div className="text-center mb-16">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 animate-fade-in leading-tight">
            {settings?.title || 'Fast Money Solutions'}
          </h1>

          {/* Description */}
          <p className="text-base text-muted-foreground max-w-2xl mx-auto animate-slide-up leading-relaxed">
            {settings?.description || 'Discover the best platforms for earning money online.'}
          </p>
        </div>

        {/* Related Searches */}
        <div className="border-t border-border pt-10">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-6">
            Related Searches
          </h2>

          <div className="flex flex-col gap-1 max-w-2xl mx-auto">
            {searches.map((search, index) => (
              <button
                key={search.id}
                onClick={() => handleSearchClick(search)}
                className="flex items-center justify-between px-4 py-3 text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-all duration-200 group w-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-base">{search.search_text}</span>
                <ChevronRight className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;