import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WebResult } from "@/types/database";
import { generateSessionId, getDeviceType, getIpInfo } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PrelanderData {
  id: string;
  is_enabled: boolean;
  logo_url: string | null;
  main_image_url: string | null;
  headline_text: string;
  headline_font_size: number;
  headline_color: string;
  headline_alignment: string;
  description_text: string;
  description_font_size: number;
  description_color: string;
  email_placeholder: string | null;
  button_text: string;
  button_color: string;
  background_color: string;
  background_image_url: string | null;
}

const Prelander = () => {
  const [searchParams] = useSearchParams();
  const resultId = searchParams.get('rid');
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<PrelanderData | null>(null);
  const [webResult, setWebResult] = useState<WebResult | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resultId) {
      fetchPrelanderData();
    }
  }, [resultId]);

  const fetchPrelanderData = async () => {
    try {
      const [prelanderRes, webResultRes] = await Promise.all([
        supabase
          .from('prelander_settings')
          .select('*')
          .eq('web_result_id', resultId)
          .maybeSingle(),
        supabase
          .from('web_results')
          .select('*')
          .eq('id', resultId)
          .single(),
      ]);

      if (prelanderRes.data) {
        setSettings(prelanderRes.data as unknown as PrelanderData);
      }
      if (webResultRes.data) {
        setWebResult(webResultRes.data as WebResult);
      }
    } catch (error) {
      console.error('Error fetching prelander data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const sessionId = generateSessionId();
      const deviceType = getDeviceType();
      const { ipAddress, country } = await getIpInfo();

      await supabase.from('email_submissions').insert({
        prelander_id: settings?.id || null,
        web_result_id: resultId,
        email,
        session_id: sessionId,
        ip_address: ipAddress,
        country,
        device_type: deviceType,
      });

      // Redirect to original link
      if (webResult?.original_link) {
        window.location.href = webResult.original_link;
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      toast({
        title: "Error",
        description: "Failed to submit. Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!settings || !webResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Page not found.</p>
          <a href="/landing" className="text-primary hover:underline mt-4 inline-block">
            Go back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ 
        backgroundColor: settings.background_color,
        backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Logo */}
        {settings.logo_url && (
          <div className="flex justify-center">
            <img 
              src={settings.logo_url} 
              alt="Logo" 
              className="max-h-16 object-contain"
            />
          </div>
        )}

        {/* Main Image */}
        {settings.main_image_url && (
          <div className="flex justify-center">
            <img 
              src={settings.main_image_url} 
              alt="Main" 
              className="max-w-full max-h-64 object-contain rounded-lg"
            />
          </div>
        )}

        {/* Headline */}
        <h1
          style={{
            fontSize: `${settings.headline_font_size}px`,
            color: settings.headline_color,
            textAlign: settings.headline_alignment as any,
          }}
          className="font-display font-bold leading-tight"
        >
          {settings.headline_text}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: `${settings.description_font_size}px`,
            color: settings.description_color,
          }}
          className="leading-relaxed"
        >
          {settings.description_text}
        </p>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
          <Input
            type="email"
            placeholder={settings.email_placeholder || "Enter your email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50"
            required
          />
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-lg font-semibold"
            style={{ backgroundColor: settings.button_color }}
          >
            {submitting ? 'Please wait...' : settings.button_text}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Prelander;
