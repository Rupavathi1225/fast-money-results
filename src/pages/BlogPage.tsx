import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  category: string | null;
  content: string;
  featured_image_url: string | null;
  status: string;
  created_at: string;
  page_id: number | null;
}

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  display_order: number;
  blog_id: string | null;
}

interface LandingSettings {
  site_name: string;
}

const BlogPage = () => {
  const { pageId } = useParams<{ pageId: string }>();

  const { data: settings } = useQuery({
    queryKey: ["landing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_settings")
        .select("site_name")
        .single();
      if (error) throw error;
      return data as LandingSettings;
    },
  });

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("page_id", parseInt(pageId || "0", 10))
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as Blog | null;
    },
  });

  const { data: relatedSearches } = useQuery({
    queryKey: ["related-searches-blog", blog?.id],
    enabled: !!blog?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_searches")
        .select("*")
        .eq("blog_id", blog!.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(4);
      if (error) throw error;
      return data as RelatedSearch[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Blog not found</h1>
          <p className="text-muted-foreground mb-6">
            The blog you're looking for doesn't exist or is not published.
          </p>
          <Link to="/landing" className="text-primary hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-4">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/landing"
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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <article>
          {blog.featured_image_url && (
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-64 object-cover rounded-lg mb-8"
            />
          )}

          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {blog.title}
            </h1>
          </header>

          <div className="prose prose-invert max-w-none">
            {blog.content.split("\n").map((paragraph, idx) => (
              <p key={idx} className="text-muted-foreground mb-4 leading-relaxed text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {/* Related Searches Section */}
        {relatedSearches && relatedSearches.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-center mb-6">
              Related Searches
            </h2>
            <div className="flex flex-col gap-1 max-w-2xl mx-auto">
              {relatedSearches.map((search) => (
                <Link
                  key={search.id}
                  to={`/wr/${search.web_result_page}?from=${pageId}`}
                  className="flex items-center justify-between px-4 py-3 text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-all duration-200 group"
                >
                  <span className="text-base">{search.title}</span>
                  <ChevronRight className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogPage;