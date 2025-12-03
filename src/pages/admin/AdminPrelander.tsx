import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { WebResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface PrelanderFormData {
  is_enabled: boolean;
  logo_url: string;
  main_image_url: string;
  headline_text: string;
  description_text: string;
  email_placeholder: string;
  button_text: string;
  button_color: string;
  background_color: string;
  background_image_url: string;
}

const defaultSettings: PrelanderFormData = {
  is_enabled: false,
  logo_url: '',
  main_image_url: '',
  headline_text: 'Welcome to Our Platform',
  description_text: 'Join thousands of users already benefiting from our service.',
  email_placeholder: 'Enter your email',
  button_text: 'Get Started Now',
  button_color: '#00b4d8',
  background_color: '#0a0f1c',
  background_image_url: '',
};

const AdminPrelander = () => {
  const { toast } = useToast();
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrelanderFormData>(defaultSettings);

  useEffect(() => {
    fetchWebResults();
  }, []);

  useEffect(() => {
    if (selectedResultId) {
      fetchPrelanderSettings();
    }
  }, [selectedResultId]);

  const fetchWebResults = async () => {
    try {
      const { data, error } = await supabase
        .from('web_results')
        .select('*')
        .order('web_result_page', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setWebResults(data as WebResult[]);
      if (data && data.length > 0) {
        setSelectedResultId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching web results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrelanderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('prelander_settings')
        .select('*')
        .eq('web_result_id', selectedResultId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const d = data as any;
        setSettings({
          is_enabled: d.is_enabled || false,
          logo_url: d.logo_url || '',
          main_image_url: d.main_image_url || '',
          headline_text: d.headline_text || defaultSettings.headline_text,
          description_text: d.description_text || defaultSettings.description_text,
          email_placeholder: d.email_placeholder || defaultSettings.email_placeholder,
          button_text: d.button_text || defaultSettings.button_text,
          button_color: d.button_color || defaultSettings.button_color,
          background_color: d.background_color || defaultSettings.background_color,
          background_image_url: d.background_image_url || '',
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching prelander settings:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedResultId) return;

    setSaving(true);
    try {
      const saveData = {
        web_result_id: selectedResultId,
        is_enabled: Boolean(settings.is_enabled),
        logo_url: settings.logo_url || null,
        main_image_url: settings.main_image_url || null,
        headline_text: settings.headline_text || 'Welcome',
        headline_font_size: 48,
        headline_color: '#ffffff',
        headline_alignment: 'center',
        description_text: settings.description_text || '',
        description_font_size: 18,
        description_color: '#cccccc',
        email_placeholder: settings.email_placeholder || 'Enter your email',
        button_text: settings.button_text || 'Get Started',
        button_color: settings.button_color || '#00b4d8',
        background_color: settings.background_color || '#0a0f1c',
        background_image_url: settings.background_image_url || null,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('prelander_settings')
        .select('id')
        .eq('web_result_id', selectedResultId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('prelander_settings')
          .update(saveData)
          .eq('web_result_id', selectedResultId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prelander_settings')
          .insert([saveData]);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Prelander settings saved successfully." });
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Pre-Landing Page Builder">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pre-Landing Page Builder">
      <div className="max-w-2xl space-y-6">
        {/* Select Web Result */}
        <div className="admin-card">
          <Label>Select Web Result</Label>
          <Select value={selectedResultId} onValueChange={setSelectedResultId}>
            <SelectTrigger className="mt-2 admin-input">
              <SelectValue placeholder="Select a web result" />
            </SelectTrigger>
            <SelectContent>
              {webResults.map((result) => (
                <SelectItem key={result.id} value={result.id}>
                  [WR {result.web_result_page}, Pos {result.display_order}] {result.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enable Toggle */}
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Pre-Landing Page</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, users will see the pre-landing page before redirecting
              </p>
            </div>
            <Switch
              checked={settings.is_enabled === true}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
          </div>
        </div>

        {/* Edit Pre-Landing Page */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary border-b pb-2">Edit Pre-Landing Page</h3>
          
          {/* Logo URL */}
          <div>
            <Label>Logo URL</Label>
            <Input
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              className="mt-1 admin-input"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Main Image URL */}
          <div>
            <Label>Main Image URL</Label>
            <Input
              value={settings.main_image_url}
              onChange={(e) => setSettings({ ...settings, main_image_url: e.target.value })}
              className="mt-1 admin-input"
              placeholder="https://example.com/main-image.jpg"
            />
          </div>

          {/* Headline */}
          <div>
            <Label>Headline</Label>
            <Input
              value={settings.headline_text}
              onChange={(e) => setSettings({ ...settings, headline_text: e.target.value })}
              className="mt-1 admin-input"
              placeholder="Your headline text"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={settings.description_text}
              onChange={(e) => setSettings({ ...settings, description_text: e.target.value })}
              className="mt-1 admin-input"
              placeholder="Describe what users will get..."
              rows={3}
            />
          </div>

          {/* Email Placeholder */}
          <div>
            <Label>Email Placeholder</Label>
            <Input
              value={settings.email_placeholder}
              onChange={(e) => setSettings({ ...settings, email_placeholder: e.target.value })}
              className="mt-1 admin-input"
              placeholder="Enter your email"
            />
          </div>

          {/* CTA Button Text */}
          <div>
            <Label>CTA Button Text</Label>
            <Input
              value={settings.button_text}
              onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
              className="mt-1 admin-input"
              placeholder="Get Started"
            />
          </div>

          {/* Background Color */}
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="color"
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                className="h-10 w-16 p-1"
              />
              <Input
                value={settings.background_color}
                onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                className="admin-input flex-1"
                placeholder="#0a0f1c"
              />
            </div>
          </div>

          {/* Background Image URL */}
          <div>
            <Label>Background Image URL (optional)</Label>
            <Input
              value={settings.background_image_url}
              onChange={(e) => setSettings({ ...settings, background_image_url: e.target.value })}
              className="mt-1 admin-input"
              placeholder="https://example.com/background.jpg"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Update Pre-Landing Page'}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminPrelander;
