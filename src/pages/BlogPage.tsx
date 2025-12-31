import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

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

const BlogPage = () => {
  const { pageId } = useParams<{ pageId: string }>();

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
        .limit(4); // Only show max 4 related searches on blog page
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          to="/landing"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <article>
          {blog.featured_image_url && (
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-64 object-cover rounded-lg mb-8"
            />
          )}

          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{blog.title}</h1>
          </header>

          <div className="prose prose-invert max-w-none">
            {blog.content.split("\n").map((paragraph, idx) => (
              <p key={idx} className="text-foreground/90 mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {/* Related Searches Section - Vertical Layout */}
        {relatedSearches && relatedSearches.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-foreground">Related Searches</h2>
            </div>
            <div className="flex flex-col gap-2 max-w-lg">
              {relatedSearches.map((search) => (
                <Link
                  key={search.id}
                  to={`/wr/${search.web_result_page}?from=${pageId}`}
                  className="flex items-center justify-between px-4 py-3 border border-border/60 hover:border-primary/50 rounded-md text-primary hover:text-primary/80 transition-all duration-200 group"
                >
                  <span className="text-sm">{search.title}</span>
                  <svg className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;