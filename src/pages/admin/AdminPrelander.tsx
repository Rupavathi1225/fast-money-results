import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, RelatedSearch } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Edit, Plus, X, Sparkles, Loader2, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  web_result_page?: number;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
}

const DEFAULT_MAIN_IMAGE = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=60';

const defaultSettings: PrelanderFormData = {
  is_enabled: false,
  logo_url: '',
  main_image_url: DEFAULT_MAIN_IMAGE,
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
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [existingPrelanders, setExistingPrelanders] = useState<ExistingPrelander[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [selectedBlogId, setSelectedBlogId] = useState<string>('');
  const [selectedRelatedSearchId, setSelectedRelatedSearchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<PrelanderFormData>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

      // Fetch related searches
      const { data: rsData, error: rsError } = await supabase
        .from('related_searches')
        .select('*')
        .order('display_order', { ascending: true });

      if (rsError) throw rsError;
      setRelatedSearches(rsData as RelatedSearch[]);

      // Fetch blogs
      const { data: blogData, error: blogError } = await supabase
        .from('blogs')
        .select('id, title, slug')
        .order('title', { ascending: true });

      if (blogError) throw blogError;
      setBlogs(blogData || []);

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
          web_result_title: wr?.title || 'Unknown',
          web_result_page: wr?.web_result_page
        };
      });

      setExistingPrelanders(prelandersWithTitles);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get related search name for a web result page
  const getRelatedSearchForPage = (pageNum: number) => {
    return relatedSearches.find(rs => rs.web_result_page === pageNum);
  };

  // Get blog-specific related searches
  const getBlogRelatedSearches = () => {
    if (!selectedBlogId) return [];
    return relatedSearches.filter(rs => rs.blog_id === selectedBlogId);
  };

  // Get web results filtered by selected related search
  const getFilteredWebResults = () => {
    if (!selectedRelatedSearchId) return [];
    const selectedRS = relatedSearches.find(rs => rs.id === selectedRelatedSearchId);
    if (!selectedRS) return [];
    return webResults.filter(wr => wr.web_result_page === selectedRS.web_result_page);
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
          main_image_url: d.main_image_url || DEFAULT_MAIN_IMAGE,
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
    setSelectedBlogId('');
    setSelectedRelatedSearchId('');
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setSelectedResultId('');
    setSelectedBlogId('');
    setSelectedRelatedSearchId('');
    setSettings(defaultSettings);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleGenerateWithAI = async () => {
    if (!selectedResultId) {
      toast({ title: "Error", description: "Please select a web result first.", variant: "destructive" });
      return;
    }

    const selectedResult = webResults.find(wr => wr.id === selectedResultId);
    if (!selectedResult) return;

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-prelander', {
        body: {
          webResultTitle: selectedResult.title,
          webResultDescription: selectedResult.description
        }
      });

      if (response.error) throw response.error;

      const generatedData = response.data;
      
      setSettings({
        ...settings,
        headline_text: generatedData.headline_text || settings.headline_text,
        description_text: generatedData.description_text || settings.description_text,
        button_text: generatedData.button_text || settings.button_text,
        email_placeholder: generatedData.email_placeholder || settings.email_placeholder,
        main_image_url: generatedData.main_image_url || DEFAULT_MAIN_IMAGE,
        logo_url: generatedData.logo_url || '',
        button_color: generatedData.button_color || '#00b4d8',
        background_color: generatedData.background_color || '#0a0f1c',
      });

      toast({ title: "Success", description: "Prelander content generated with AI!" });
    } catch (error) {
      console.error('Error generating prelander:', error);
      toast({ title: "Error", description: "Failed to generate content.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
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
        main_image_url: settings.main_image_url || DEFAULT_MAIN_IMAGE,
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

  // Get available web results (not already having a prelander, unless editing)
  const getAvailableWebResults = () => {
    if (isEditing) return webResults;
    return webResults.filter(wr => !existingPrelanders.some(pl => pl.web_result_id === wr.id));
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
      <div className="space-y-6">
        {/* Create New Button at top */}
        {!showForm && (
          <div className="flex justify-end">
            <Button onClick={handleCreateNew} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>
        )}

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

            {/* Step 1: Select Blog */}
            <div>
              <Label className="mb-2 block">1️⃣ Select Blog</Label>
              <Select 
                value={selectedBlogId} 
                onValueChange={(value) => {
                  setSelectedBlogId(value);
                  setSelectedRelatedSearchId('');
                  setSelectedResultId('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a blog..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Related Search (filtered by blog) */}
            {selectedBlogId && (
              <div>
                <Label className="mb-2 block">2️⃣ Select Related Search (from "{blogs.find(b => b.id === selectedBlogId)?.title}")</Label>
                {getBlogRelatedSearches().length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No related searches for this blog.</p>
                ) : (
                  <Select 
                    value={selectedRelatedSearchId} 
                    onValueChange={(value) => {
                      setSelectedRelatedSearchId(value);
                      setSelectedResultId('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a related search..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {getBlogRelatedSearches().map((rs) => (
                        <SelectItem key={rs.id} value={rs.id}>
                          {rs.title} (wr={rs.web_result_page})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Step 3: Select Web Result (filtered by related search) */}
            {selectedRelatedSearchId && (
              <div>
                <Label className="mb-2 block">3️⃣ Select Web Result</Label>
                {getFilteredWebResults().length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No web results for this related search.</p>
                ) : (
                  <Select 
                    value={selectedResultId} 
                    onValueChange={setSelectedResultId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a web result..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {getFilteredWebResults().map((result) => (
                        <SelectItem key={result.id} value={result.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{result.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {result.description?.substring(0, 50)}...
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Generate with AI Button */}
            {selectedResultId && (
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleGenerateWithAI} 
                  disabled={generating}
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Auto-fill all fields based on selected web result
                </span>
              </div>
            )}

            {/* Logo URL */}
            <div>
              <Label>Logo URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  className="flex-1"
                  placeholder="https://example.com/logo.png"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSettings({ ...settings, logo_url: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=100&h=100&fit=crop' })}
                >
                  Use Default
                </Button>
              </div>
              {settings.logo_url && (
                <div className="mt-2">
                  <img 
                    src={settings.logo_url} 
                    alt="Logo Preview" 
                    className="max-h-16 rounded object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
            </div>

            {/* Main Image URL */}
            <div>
              <Label>Main Image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={settings.main_image_url}
                  onChange={(e) => setSettings({ ...settings, main_image_url: e.target.value })}
                  className="flex-1"
                  placeholder="https://example.com/main-image.jpg"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSettings({ ...settings, main_image_url: DEFAULT_MAIN_IMAGE })}
                >
                  Use Default
                </Button>
              </div>
              {settings.main_image_url && (
                <div className="mt-2">
                  <img 
                    src={settings.main_image_url} 
                    alt="Preview" 
                    className="max-h-32 rounded-lg object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
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
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.background_color}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  placeholder="#0a0f1c"
                />
              </div>
            </div>

            {/* Button Color */}
            <div>
              <Label>Button Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={settings.button_color}
                  onChange={(e) => setSettings({ ...settings, button_color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.button_color}
                  onChange={(e) => setSettings({ ...settings, button_color: e.target.value })}
                  placeholder="#00b4d8"
                />
              </div>
            </div>

            {/* Background Image URL */}
            <div>
              <Label>Background Image URL (Optional)</Label>
              <Input
                value={settings.background_image_url}
                onChange={(e) => setSettings({ ...settings, background_image_url: e.target.value })}
                className="mt-1"
                placeholder="https://example.com/bg-image.jpg"
              />
            </div>

            {/* Save Button */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving || !selectedResultId}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Enable Prelander'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Prelanders List - at bottom */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Existing Pre-Landing Pages</h2>
          
          {/* Search Box */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prelanders by title or headline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {existingPrelanders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prelanders created yet.</p>
          ) : (
            <div className="space-y-2">
              {existingPrelanders.filter(pl => 
                (pl.web_result_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                pl.headline_text.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((pl) => (
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
              {existingPrelanders.filter(pl => 
                (pl.web_result_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                pl.headline_text.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && searchQuery && (
                <p className="text-muted-foreground text-sm">No prelanders matching "{searchQuery}"</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPrelander;
