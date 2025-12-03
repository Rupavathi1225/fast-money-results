import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, PrelanderSettings } from "@/types/database";
import { trackClick, getIpInfo } from "@/lib/tracking";

const LinkRedirect = () => {
  const { linkId } = useParams();
  const [searchParams] = useSearchParams();
  const resultId = searchParams.get('rid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleRedirect();
  }, [linkId, resultId]);

  const handleRedirect = async () => {
    if (!resultId) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    try {
      // Get the web result and prelander settings
      const [resultRes, prelanderRes] = await Promise.all([
        supabase
          .from('web_results')
          .select('*')
          .eq('id', resultId)
          .single(),
        supabase
          .from('prelander_settings')
          .select('*')
          .eq('web_result_id', resultId)
          .eq('is_enabled', true)
          .maybeSingle(),
      ]);

      if (resultRes.error || !resultRes.data) {
        setError('Link not found');
        setLoading(false);
        return;
      }

      const webResult = resultRes.data as WebResult;
      const prelander = prelanderRes.data as PrelanderSettings | null;

      // Track the click
      await trackClick(parseInt(linkId || '0'), resultId, document.referrer);

      // Check if prelander is enabled
      if (prelander && prelander.is_enabled) {
        // Redirect to prelander page
        window.location.href = `/prelander?rid=${resultId}`;
        return;
      }

      // No prelander, check country permissions and redirect directly
      let targetUrl = webResult.original_link;

      try {
        const { country } = await getIpInfo();

        const isWorldwide = webResult.country_permissions?.includes('worldwide');
        const isCountryAllowed = webResult.country_permissions?.includes(country);

        if (!isWorldwide && !isCountryAllowed && webResult.fallback_link) {
          targetUrl = webResult.fallback_link;
        }
      } catch (e) {
        console.log('Could not determine country');
      }

      // Redirect to the target URL
      window.location.href = targetUrl;
    } catch (error) {
      console.error('Error in redirect:', error);
      setError('An error occurred');
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Oops!</h1>
          <p className="text-muted-foreground">{error}</p>
          <a href="/landing" className="text-primary hover:underline mt-4 inline-block">
            Go back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default LinkRedirect;
