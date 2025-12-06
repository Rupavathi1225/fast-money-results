import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { WebResult, COUNTRIES } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, ExternalLink } from "lucide-react";

const AdminWebResults = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<WebResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    logo_url: '',
    original_link: '',
    web_result_page: 1,
    display_order: 0,
    is_active: true,
    is_sponsored: false,
    country_permissions: ['worldwide'] as string[],
    fallback_link: '',
  });

  useEffect(() => {
    fetchResults();
  }, [selectedPage]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('web_results')
        .select('*')
        .eq('web_result_page', selectedPage)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setResults(data as WebResult[]);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      logo_url: '',
      original_link: '',
      web_result_page: selectedPage,
      display_order: 0,
      is_active: true,
      is_sponsored: false,
      country_permissions: ['worldwide'],
      fallback_link: '',
    });
    setEditingId(null);
  };

  const handleEdit = (result: WebResult) => {
    setEditingId(result.id);
    setFormData({
      title: result.title,
      description: result.description || '',
      logo_url: result.logo_url || '',
      original_link: result.original_link,
      web_result_page: result.web_result_page,
      display_order: result.display_order,
      is_active: result.is_active,
      is_sponsored: (result as any).is_sponsored || false,
      country_permissions: result.country_permissions || ['worldwide'],
      fallback_link: result.fallback_link || '',
    });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.original_link) {
      toast({ title: "Error", description: "Title and Original Link are required.", variant: "destructive" });
      return;
    }

    try {
      const saveData = {
        ...formData,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        fallback_link: formData.fallback_link || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('web_results')
          .update({
            ...saveData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Web result updated successfully." });
      } else {
        const { error } = await supabase
          .from('web_results')
          .insert([saveData]);

        if (error) throw error;
        toast({ title: "Success", description: "Web result created successfully." });
      }

      resetForm();
      fetchResults();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save web result.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this web result?')) return;

    try {
      const { error } = await supabase
        .from('web_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Web result deleted successfully." });
      fetchResults();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete web result.", variant: "destructive" });
    }
  };

  const toggleCountry = (country: string) => {
    const current = formData.country_permissions;
    if (country === 'worldwide') {
      setFormData({ ...formData, country_permissions: ['worldwide'] });
    } else {
      const filtered = current.filter(c => c !== 'worldwide');
      if (filtered.includes(country)) {
        setFormData({ ...formData, country_permissions: filtered.filter(c => c !== country) });
      } else {
        setFormData({ ...formData, country_permissions: [...filtered, country] });
      }
    }
  };

  const filteredResults = results.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Web Results Editor">
      <div className="space-y-6">
        {/* Page Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <Label>Select Page:</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((page) => (
              <Button
                key={page}
                variant={selectedPage === page ? "default" : "outline"}
                onClick={() => {
                  setSelectedPage(page);
                  setFormData(prev => ({ ...prev, web_result_page: page }));
                }}
              >
                wr={page}
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search web results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 admin-input"
          />
        </div>

        {/* Add/Edit Form */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingId ? 'Edit Web Result' : 'Add Web Result'} - Page wr={formData.web_result_page}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 admin-input"
                placeholder="e.g., Fiverr"
              />
            </div>
            
            <div>
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="mt-1 admin-input"
                placeholder="https://example.com/logo.png"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 admin-input"
                placeholder="Enter description..."
              />
            </div>
            
            <div>
              <Label>Original Link *</Label>
              <Input
                value={formData.original_link}
                onChange={(e) => setFormData({ ...formData, original_link: e.target.value })}
                className="mt-1 admin-input"
                placeholder="https://www.fiverr.com"
              />
            </div>
            
            <div>
              <Label>Fallback Link (for restricted countries)</Label>
              <Input
                value={formData.fallback_link}
                onChange={(e) => setFormData({ ...formData, fallback_link: e.target.value })}
                className="mt-1 admin-input"
                placeholder="https://alternative-link.com"
              />
            </div>
            
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                min={0}
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="mt-1 admin-input"
              />
            </div>
            
            <div className="flex items-center gap-6 pt-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_sponsored}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_sponsored: checked })}
                />
                <Label className="text-amber-500">Sponsored</Label>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Label className="mb-2 block">Country Permissions</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-secondary/20 rounded-lg">
                {COUNTRIES.map((country) => (
                  <button
                    key={country}
                    onClick={() => toggleCountry(country)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      formData.country_permissions.includes(country)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Existing Results */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Existing Web Results - Page wr={selectedPage}
          </h3>
          
          {loading ? (
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((result, index) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {result.logo_url ? (
                      <img src={result.logo_url} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {result.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{result.title}</p>
                      <p className="text-sm text-muted-foreground">
                        lid={index + 1} | Order: {result.display_order}
                        {!result.is_active && ' | Inactive'}
                        {(result as any).is_sponsored && <span className="text-amber-500 font-medium"> | Sponsored</span>}
                      </p>
                      <a 
                        href={result.original_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {result.original_link.substring(0, 40)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(result)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(result.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredResults.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No web results found for page wr={selectedPage}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWebResults;
