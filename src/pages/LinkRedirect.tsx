import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult } from "@/types/database";
import { trackClick } from "@/lib/tracking";

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
      // Get the web result
      const { data: result, error: fetchError } = await supabase
        .from('web_results')
        .select('*')
        .eq('id', resultId)
        .single();

      if (fetchError || !result) {
        setError('Link not found');
        setLoading(false);
        return;
      }

      const webResult = result as WebResult;

      // Track the click
      await trackClick(parseInt(linkId || '0'), resultId, document.referrer);

      // Check country permissions
      let targetUrl = webResult.original_link;

      // Get user's country
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const userCountry = data.country_name || '';

        // Check if country is allowed
        const isWorldwide = webResult.country_permissions?.includes('worldwide');
        const isCountryAllowed = webResult.country_permissions?.includes(userCountry);

        if (!isWorldwide && !isCountryAllowed && webResult.fallback_link) {
          targetUrl = webResult.fallback_link;
        }
      } catch (e) {
        // If we can't determine country, use original link
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
