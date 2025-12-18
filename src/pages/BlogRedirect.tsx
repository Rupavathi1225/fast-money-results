import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const BlogRedirect = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogAndRedirect = async () => {
      try {
        const pageIndex = parseInt(pageId || "1") - 1;
        
        const { data: blogs, error } = await supabase
          .from("blogs")
          .select("slug")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (blogs && blogs[pageIndex]) {
          navigate(`/blog/${blogs[pageIndex].slug}`, { replace: true });
        } else {
          navigate("/landing", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        navigate("/landing", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchBlogAndRedirect();
  }, [pageId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
};

export default BlogRedirect;
