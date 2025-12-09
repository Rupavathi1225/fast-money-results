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
}

interface RelatedSearch {
  id: string;
  title: string;
  search_text: string;
  web_result_page: number;
  display_order: number;
}

const BlogPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as Blog | null;
    },
  });

  const { data: relatedSearches } = useQuery({
    queryKey: ["related-searches-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_searches")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(5);
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

          <header className="mb-8">
            {blog.category && (
              <span className="text-primary text-sm font-medium">{blog.category}</span>
            )}
            <h1 className="text-4xl font-bold text-foreground mt-2 mb-4">{blog.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              {blog.author && <span>By {blog.author}</span>}
              <span>
                {new Date(blog.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </header>

          <div className="prose prose-invert max-w-none">
            {blog.content.split("\n").map((paragraph, idx) => (
              <p key={idx} className="text-foreground/90 mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        {/* Related Searches Section */}
        {relatedSearches && relatedSearches.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Related Searches</h2>
            <div className="flex flex-wrap gap-3">
              {relatedSearches.map((search) => (
                <Link
                  key={search.id}
                  to={`/wr/${search.web_result_page}`}
                  className="px-4 py-2 bg-muted/50 hover:bg-muted rounded-full text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  {search.title}
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