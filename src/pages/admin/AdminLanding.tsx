import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { LandingSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const AdminLanding = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data as LandingSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('landing_settings')
        .update({
          site_name: settings.site_name,
          title: settings.title,
          description: settings.description,
          redirect_enabled: settings.redirect_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Landing page settings saved successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Landing Page Editor">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Landing Page Editor">
      <div className="max-w-2xl">
        <div className="admin-card space-y-6">
          <div>
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              value={settings?.title || ''}
              onChange={(e) => setSettings(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="mt-2 admin-input"
              placeholder="Fast Money Solutions"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings?.description || ''}
              onChange={(e) => setSettings(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="mt-2 admin-input min-h-[120px]"
              placeholder="Enter page description..."
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="redirect-toggle" className="text-base font-medium">Auto-Redirect</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Enable automatic 5-second redirect to fallback URLs on landing pages.
                When OFF, no redirect happens (SEO-safe for Google crawling).
              </p>
            </div>
            <Switch
              id="redirect-toggle"
              checked={settings?.redirect_enabled || false}
              onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, redirect_enabled: checked } : null)}
            />
          </div>

          <Button
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLanding;
