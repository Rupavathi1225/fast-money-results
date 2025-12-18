import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { supabase } from "@/integrations/supabase/client";
import { WebResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, ExternalLink, Sparkles, Loader2, Copy } from "lucide-react";
import { exportToCSV } from "@/lib/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RelatedSearch {
  id: string;
  title: string;
  web_result_page: number;
  blog_id: string | null;
}

interface Blog {
  id: string;
  title: string;
}

interface GeneratedResult {
  title: string;
  description: string;
  link: string;
  targetPage: number;
  selected: boolean;
  isSponsored: boolean;
}

const AdminWebResults = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<WebResult[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRelatedSearch, setSelectedRelatedSearch] = useState<string>('');
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    logo_url: '',
    original_link: '',
    web_result_page: 1,
    display_order: 0,
    is_active: true,
    is_sponsored: false,
  });

  useEffect(() => {
    fetchResults();
    fetchRelatedSearches();
    fetchBlogs();
  }, [selectedPage]);

  const fetchRelatedSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('id, title, web_result_page, blog_id')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setRelatedSearches(data || []);
    } catch (error) {
      console.error('Error fetching related searches:', error);
    }
  };

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title')
        .order('title', { ascending: true });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('web_results')
        .select('*')
        .eq('web_result_page', selectedPage)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setResults(data as WebResult[]);
      setSelectedIds(new Set());
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
      is_sponsored: result.is_sponsored || false,
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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleExportAll = () => {
    exportToCSV(results, 'web-results', [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'description', header: 'Description' },
      { key: 'original_link', header: 'Original Link' },
      { key: 'web_result_page', header: 'Page' },
      { key: 'display_order', header: 'Order' },
      { key: 'is_active', header: 'Active' },
      { key: 'is_sponsored', header: 'Sponsored' },
    ]);
    toast({ title: "Exported all web results to CSV" });
  };

  const handleExportSelected = () => {
    const selectedData = results.filter(r => selectedIds.has(r.id));
    exportToCSV(selectedData, 'web-results-selected', [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'description', header: 'Description' },
      { key: 'original_link', header: 'Original Link' },
      { key: 'web_result_page', header: 'Page' },
      { key: 'display_order', header: 'Order' },
      { key: 'is_active', header: 'Active' },
      { key: 'is_sponsored', header: 'Sponsored' },
    ]);
    toast({ title: `Exported ${selectedIds.size} web results to CSV` });
  };

  const handleCopy = () => {
    const selectedData = results.filter(r => selectedIds.has(r.id));
    const baseUrl = window.location.origin;
    const text = selectedData.map((r, idx) => `${baseUrl}/wr/${r.web_result_page}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied links to clipboard" });
  };

  const handleCopyLink = (result: WebResult) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/wr/${result.web_result_page}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  const handleBulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('web_results')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Activated ${selectedIds.size} web results` });
      fetchResults();
    } catch (error) {
      toast({ title: "Error activating", variant: "destructive" });
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('web_results')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Deactivated ${selectedIds.size} web results` });
      fetchResults();
    } catch (error) {
      toast({ title: "Error deactivating", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

    try {
      const { error } = await supabase
        .from('web_results')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Deleted ${selectedIds.size} web results` });
      fetchResults();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const filteredResults = results.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateAIResults = async () => {
    const search = relatedSearches.find(s => s.id === selectedRelatedSearch);
    if (!search) {
      toast({ title: "Error", description: "Please select a related search first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-web-results', {
        body: { searchTitle: search.title }
      });

      if (error) throw error;

      const generated = (data.results || []).map((r: any, idx: number) => ({
        title: r.title,
        description: r.description,
        link: r.link || '',
        targetPage: search.web_result_page,
        selected: true,
        isSponsored: false,
      }));

      setGeneratedResults(generated);
      setSelectedPage(search.web_result_page);
      toast({ title: "Success", description: "Generated 6 web results. Select which ones to save." });
    } catch (error) {
      console.error('Error generating:', error);
      toast({ title: "Error", description: "Failed to generate web results.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedResults = async () => {
    const toSave = generatedResults.filter(r => r.selected);
    if (toSave.length === 0) {
      toast({ title: "Error", description: "Please select at least one result to save.", variant: "destructive" });
      return;
    }

    const missingLinks = toSave.filter(r => !r.link.trim());
    if (missingLinks.length > 0) {
      toast({ title: "Error", description: "Please enter a link URL for all selected results.", variant: "destructive" });
      return;
    }

    try {
      const inserts = toSave.map((r, idx) => ({
        title: r.title,
        description: r.description,
        original_link: r.link,
        web_result_page: r.targetPage,
        display_order: idx,
        is_active: true,
        is_sponsored: r.isSponsored,
      }));

      const { error } = await supabase.from('web_results').insert(inserts);
      if (error) throw error;

      toast({ title: "Success", description: `Saved ${toSave.length} web results.` });
      setGeneratedResults([]);
      setSelectedRelatedSearch('');
      fetchResults();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save web results.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout title="Web Results Editor">
      <div className="space-y-6">
        {/* AI Generator Section */}
        <div className="admin-card border-2 border-primary/30">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Web Results Generator
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Related Search</Label>
                <Select
                  value={selectedRelatedSearch}
                  onValueChange={(value) => {
                    setSelectedRelatedSearch(value);
                    const search = relatedSearches.find(s => s.id === value);
                    if (search) {
                      setSelectedPage(search.web_result_page);
                      setFormData(prev => ({ ...prev, web_result_page: search.web_result_page }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 admin-input">
                    <SelectValue placeholder="Choose a related search" />
                  </SelectTrigger>
                  <SelectContent>
                    {relatedSearches.map((search) => {
                      const linkedBlog = blogs.find(b => b.id === search.blog_id);
                      return (
                        <SelectItem key={search.id} value={search.id}>
                          {search.title} (wr={search.web_result_page}){linkedBlog && ` [${linkedBlog.title}]`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleGenerateAIResults} 
                  disabled={!selectedRelatedSearch || isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate 6 Web Results
                </Button>
              </div>
            </div>

            {/* Generated Results */}
            {generatedResults.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-base">Generated Results for page wr={generatedResults[0]?.targetPage}:</Label>
                  <span className="text-sm text-muted-foreground">(All results will appear on this page)</span>
                </div>
                {generatedResults.map((result, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border space-y-3 ${result.isSponsored ? 'bg-amber-500/10 border-amber-500/50' : 'bg-secondary/50 border-border/50'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={result.selected}
                        onCheckedChange={(checked) => {
                          const updated = [...generatedResults];
                          updated[idx].selected = !!checked;
                          setGeneratedResults(updated);
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Title (3 words)</Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Sponsored</Label>
                            <Switch
                              checked={result.isSponsored}
                              onCheckedChange={(checked) => {
                                const updated = [...generatedResults];
                                updated[idx].isSponsored = checked;
                                setGeneratedResults(updated);
                              }}
                            />
                          </div>
                        </div>
                        <Input
                          value={result.title}
                          onChange={(e) => {
                            const updated = [...generatedResults];
                            updated[idx].title = e.target.value;
                            setGeneratedResults(updated);
                          }}
                          className="admin-input"
                        />
                        <div>
                          <Label className="text-xs text-muted-foreground">Description (15 words)</Label>
                          <Textarea
                            value={result.description}
                            onChange={(e) => {
                              const updated = [...generatedResults];
                              updated[idx].description = e.target.value;
                              setGeneratedResults(updated);
                            }}
                            className="mt-1 admin-input"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Link URL (required)</Label>
                          <Input
                            value={result.link}
                            onChange={(e) => {
                              const updated = [...generatedResults];
                              updated[idx].link = e.target.value;
                              setGeneratedResults(updated);
                            }}
                            placeholder="https://example.com"
                            className="mt-1 admin-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={handleSaveGeneratedResults}>
                    Save Selected Results to wr={generatedResults[0]?.targetPage}
                  </Button>
                  <Button variant="outline" onClick={() => setGeneratedResults([])}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <Label>Select Page:</Label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((page) => {
              const relatedSearch = relatedSearches.find(s => s.web_result_page === page);
              return (
                <Button
                  key={page}
                  variant={selectedPage === page ? "default" : "outline"}
                  onClick={() => {
                    setSelectedPage(page);
                    setFormData(prev => ({ ...prev, web_result_page: page }));
                  }}
                  className="flex-col h-auto py-2 px-4"
                  title={relatedSearch?.title || `Page ${page}`}
                >
                  <span>wr={page}</span>
                  {relatedSearch && (
                    <span className="text-xs opacity-70 max-w-[80px] truncate">
                      {relatedSearch.title}
                    </span>
                  )}
                </Button>
              );
            })}
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

        {/* Bulk Actions */}
        <BulkActionToolbar
          totalCount={filteredResults.length}
          selectedCount={selectedIds.size}
          allSelected={selectedIds.size === filteredResults.length && filteredResults.length > 0}
          onSelectAll={handleSelectAll}
          onExportAll={handleExportAll}
          onExportSelected={handleExportSelected}
          onCopy={handleCopy}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onDelete={handleBulkDelete}
        />

        {/* Add/Edit Form */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingId ? 'Edit Web Result' : 'Add Web Result Manually'} - Page wr={formData.web_result_page}
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
              <Label>Related Search (determines page)</Label>
              <Select
                value={formData.web_result_page.toString()}
                onValueChange={(value) => {
                  const page = parseInt(value);
                  setFormData({ ...formData, web_result_page: page });
                  setSelectedPage(page);
                }}
              >
                <SelectTrigger className="mt-1 admin-input">
                  <SelectValue placeholder="Select related search" />
                </SelectTrigger>
                <SelectContent>
                  {relatedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.web_result_page.toString()}>
                      {search.title} (wr={search.web_result_page})
                    </SelectItem>
                  ))}
                  {relatedSearches.length === 0 && (
                    <SelectItem value="1" disabled>No related searches found</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="mt-1 admin-input"
                placeholder="https://example.com/logo.png"
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
                    <Checkbox
                      checked={selectedIds.has(result.id)}
                      onCheckedChange={() => toggleSelection(result.id)}
                    />
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
                      onClick={() => handleCopyLink(result)}
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
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
