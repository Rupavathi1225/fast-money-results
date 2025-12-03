import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, PrelanderSettings } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const AdminPrelander = () => {
  const { toast } = useToast();
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<Partial<PrelanderSettings>>({
    is_enabled: false,
    headline_text: 'Welcome to Our Platform',
    headline_font_size: 48,
    headline_color: '#ffffff',
    headline_alignment: 'center',
    description_text: 'Join thousands of users already benefiting from our service.',
    description_font_size: 18,
    description_color: '#cccccc',
    button_text: 'Get Started Now',
    button_color: '#00b4d8',
    background_color: '#0a0f1c',
    background_image_url: '',
  });

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
        setSettings(data as PrelanderSettings);
      } else {
        setSettings({
          is_enabled: false,
          headline_text: 'Welcome to Our Platform',
          headline_font_size: 48,
          headline_color: '#ffffff',
          headline_alignment: 'center',
          description_text: 'Join thousands of users already benefiting from our service.',
          description_font_size: 18,
          description_color: '#cccccc',
          button_text: 'Get Started Now',
          button_color: '#00b4d8',
          background_color: '#0a0f1c',
          background_image_url: '',
        });
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
        headline_text: settings.headline_text || 'Welcome',
        headline_font_size: settings.headline_font_size || 48,
        headline_color: settings.headline_color || '#ffffff',
        headline_alignment: settings.headline_alignment || 'center',
        description_text: settings.description_text || '',
        description_font_size: settings.description_font_size || 18,
        description_color: settings.description_color || '#cccccc',
        button_text: settings.button_text || 'Get Started',
        button_color: settings.button_color || '#00b4d8',
        background_color: settings.background_color || '#0a0f1c',
        background_image_url: settings.background_image_url || null,
        updated_at: new Date().toISOString(),
      };
      
      console.log('Saving prelander settings:', saveData);

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
      <AdminLayout title="Prelander Settings">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Prelander Settings">
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
                  [wr={result.web_result_page}] {result.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enable Toggle */}
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Prelander</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, users will see the prelander before redirecting
              </p>
            </div>
            <Switch
              checked={settings.is_enabled === true}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
          </div>
        </div>

        {/* Headline */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary">Headline</h3>
          
          <div>
            <Label>Headline Text</Label>
            <Input
              value={settings.headline_text}
              onChange={(e) => setSettings({ ...settings, headline_text: e.target.value })}
              className="mt-1 admin-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Font Size (px)</Label>
              <Input
                type="number"
                value={settings.headline_font_size}
                onChange={(e) => setSettings({ ...settings, headline_font_size: parseInt(e.target.value) || 48 })}
                className="mt-1 admin-input"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={settings.headline_color}
                onChange={(e) => setSettings({ ...settings, headline_color: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <Select 
                value={settings.headline_alignment} 
                onValueChange={(v) => setSettings({ ...settings, headline_alignment: v })}
              >
                <SelectTrigger className="mt-1 admin-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary">Description</h3>
          
          <div>
            <Label>Description Text</Label>
            <Textarea
              value={settings.description_text}
              onChange={(e) => setSettings({ ...settings, description_text: e.target.value })}
              className="mt-1 admin-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Font Size (px)</Label>
              <Input
                type="number"
                value={settings.description_font_size}
                onChange={(e) => setSettings({ ...settings, description_font_size: parseInt(e.target.value) || 18 })}
                className="mt-1 admin-input"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={settings.description_color}
                onChange={(e) => setSettings({ ...settings, description_color: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>
        </div>

        {/* Email Field */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary">Email Field</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Users must enter their email before being redirected to the destination.
          </p>
          <div>
            <Label>Email Input Preview</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              className="mt-1 admin-input"
              disabled
            />
          </div>
        </div>

        {/* Call-to-Action Button */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary">Call-to-Action Button</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Button Text</Label>
              <Input
                value={settings.button_text}
                onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                className="mt-1 admin-input"
              />
            </div>
            <div>
              <Label>Button Color</Label>
              <Input
                type="color"
                value={settings.button_color}
                onChange={(e) => setSettings({ ...settings, button_color: e.target.value })}
                className="mt-1 h-10"
              />
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="admin-card space-y-4">
          <h3 className="font-semibold text-primary">Background</h3>
          
          <div>
            <Label>Background Color</Label>
            <Input
              type="color"
              value={settings.background_color}
              onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
              className="mt-1 h-10 w-full"
            />
          </div>

          <div>
            <Label>Background Image (Optional)</Label>
            <Input
              value={settings.background_image_url || ''}
              onChange={(e) => setSettings({ ...settings, background_image_url: e.target.value })}
              className="mt-1 admin-input"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Page Settings'}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminPrelander;
