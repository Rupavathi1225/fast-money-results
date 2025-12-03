import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { WebResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Edit, Plus, X } from "lucide-react";

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

interface ExistingPrelander {
  id: string;
  web_result_id: string;
  headline_text: string;
  is_enabled: boolean;
  web_result_title?: string;
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
  const [existingPrelanders, setExistingPrelanders] = useState<ExistingPrelander[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrelanderFormData>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedResultId) {
      fetchPrelanderSettings();
    }
  }, [selectedResultId]);

  const fetchData = async () => {
    try {
      // Fetch web results
      const { data: wrData, error: wrError } = await supabase
        .from('web_results')
        .select('*')
        .order('web_result_page', { ascending: true })
        .order('display_order', { ascending: true });

      if (wrError) throw wrError;
      setWebResults(wrData as WebResult[]);

      // Fetch existing prelanders
      const { data: plData, error: plError } = await supabase
        .from('prelander_settings')
        .select('id, web_result_id, headline_text, is_enabled')
        .order('created_at', { ascending: false });

      if (plError) throw plError;

      // Map prelanders with web result titles
      const prelandersWithTitles = (plData || []).map(pl => {
        const wr = wrData?.find(w => w.id === pl.web_result_id);
        return {
          ...pl,
          web_result_title: wr?.title || 'Unknown'
        };
      });

      setExistingPrelanders(prelandersWithTitles);
    } catch (error) {
      console.error('Error fetching data:', error);
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
        setIsEditing(true);
      } else {
        setSettings(defaultSettings);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error fetching prelander settings:', error);
    }
  };

  const handleEdit = (webResultId: string) => {
    setSelectedResultId(webResultId);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setSelectedResultId('');
    setSettings(defaultSettings);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedResultId) {
      toast({ title: "Error", description: "Please select a web result.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        web_result_id: selectedResultId,
        is_enabled: true,
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

      toast({ title: "Success", description: "Prelander settings saved and enabled." });
      setShowForm(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Get web results that don't have prelanders yet
  const availableWebResults = webResults.filter(
    wr => !existingPrelanders.some(pl => pl.web_result_id === wr.id) || selectedResultId === wr.id
  );

  if (loading) {
    return (
      <AdminLayout title="Pre-Landing Page Builder">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pre-Landing Page Builder">
      <div className="space-y-6">
        {/* Existing Prelanders List */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Existing Pre-Landing Pages</h2>
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>

          {existingPrelanders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prelanders created yet.</p>
          ) : (
            <div className="space-y-2">
              {existingPrelanders.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{pl.web_result_title}</p>
                    <p className="text-sm text-muted-foreground">{pl.headline_text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${pl.is_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {pl.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(pl.web_result_id)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form (shown when creating/editing) */}
        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? 'Edit Pre-Landing Page' : 'Create New Pre-Landing Page'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Select Web Result */}
            <div>
              <Label>Select Web Result</Label>
              <Select value={selectedResultId} onValueChange={setSelectedResultId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a web result" />
                </SelectTrigger>
                <SelectContent>
                  {(isEditing ? webResults : availableWebResults).map((result) => (
                    <SelectItem key={result.id} value={result.id}>
                      [WR {result.web_result_page}, Pos {result.display_order}] {result.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Logo URL */}
            <div>
              <Label>Logo URL</Label>
              <Input
                value={settings.logo_url}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                className="mt-1"
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Main Image URL */}
            <div>
              <Label>Main Image URL</Label>
              <Input
                value={settings.main_image_url}
                onChange={(e) => setSettings({ ...settings, main_image_url: e.target.value })}
                className="mt-1"
                placeholder="https://example.com/main-image.jpg"
              />
            </div>

            {/* Headline */}
            <div>
              <Label>Headline</Label>
              <Input
                value={settings.headline_text}
                onChange={(e) => setSettings({ ...settings, headline_text: e.target.value })}
                className="mt-1"
                placeholder="Your headline text"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={settings.description_text}
                onChange={(e) => setSettings({ ...settings, description_text: e.target.value })}
                className="mt-1"
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
                className="mt-1"
                placeholder="Enter your email"
              />
            </div>

            {/* CTA Button Text */}
            <div>
              <Label>CTA Button Text</Label>
              <Input
                value={settings.button_text}
                onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                className="mt-1"
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
                  className="flex-1"
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
                className="mt-1"
                placeholder="https://example.com/background.jpg"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : isEditing ? 'Update Pre-Landing Page' : 'Create Pre-Landing Page'}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPrelander;
