import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingSettings, RelatedSearch } from "@/types/database";
import { trackRelatedSearchClick } from "@/lib/tracking";
import { Search } from "lucide-react";

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
            {settings?.site_name || 'OfferGrabZone'}
          </h1>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
            {settings?.title || 'Grab Hot Deals Faster'}
          </h2>

          {/* Description */}
          <p className="text-gray-400 mb-12 max-w-xl mx-auto animate-slide-up">
            {settings?.description || 'Finding great offers is all OfferGrabZone helps users spot trending deals, hidden discounts, and limited-time steals before they disappear.'}
          </p>

          {/* Related Searches */}
          <div className="mt-12">
            <h3 className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-wider">
              Related Searches
            </h3>

            <div className="flex flex-col gap-3 max-w-xl mx-auto">
              {searches.map((search, index) => (
                <button
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="flex items-center justify-between px-5 py-4 bg-transparent border border-emerald-500/40 hover:border-emerald-500 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all duration-200 group w-full"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-sm font-medium">{search.search_text}</span>
                  <svg className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-6 text-center">
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} {settings?.site_name || 'OfferGrabZone'}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
