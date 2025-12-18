import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { supabase } from "@/integrations/supabase/client";
import { RelatedSearch } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, Copy } from "lucide-react";
import { exportToCSV } from "@/lib/csvExport";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

const AdminCategories = () => {
  const { toast } = useToast();
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedBlogFilter, setSelectedBlogFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    search_text: '',
    title: '',
    web_result_page: 1,
    position: 1,
    display_order: 0,
    is_active: true,
    blog_id: '' as string | null,
  });

  useEffect(() => {
    fetchSearches();
    fetchBlogs();
  }, []);

  const fetchSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSearches(data as RelatedSearch[]);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug')
        .order('title', { ascending: true });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      search_text: '',
      title: '',
      web_result_page: 1,
      position: 1,
      display_order: 0,
      is_active: true,
      blog_id: selectedBlogFilter !== 'all' && selectedBlogFilter !== 'none' ? selectedBlogFilter : null,
    });
    setEditingId(null);
  };

  const handleEdit = (search: RelatedSearch) => {
    setEditingId(search.id);
    setFormData({
      search_text: search.search_text,
      title: search.title,
      web_result_page: search.web_result_page,
      position: search.position,
      display_order: search.display_order,
      is_active: search.is_active,
      blog_id: search.blog_id,
    });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('related_searches')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully." });
      } else {
        const { error } = await supabase
          .from('related_searches')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully." });
      }

      resetForm();
      fetchSearches();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('related_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Category deleted successfully." });
      fetchSearches();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
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
      setSelectedIds(new Set(filteredSearches.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleExportAll = () => {
    exportToCSV(searches, 'related-searches', [
      { key: 'id', header: 'ID' },
      { key: 'search_text', header: 'Search Text' },
      { key: 'title', header: 'Title' },
      { key: 'web_result_page', header: 'Web Result Page' },
      { key: 'position', header: 'Position' },
      { key: 'display_order', header: 'Display Order' },
      { key: 'is_active', header: 'Active' },
    ]);
    toast({ title: "Exported all searches to CSV" });
  };

  const handleExportSelected = () => {
    const selectedData = searches.filter(s => selectedIds.has(s.id));
    exportToCSV(selectedData, 'related-searches-selected', [
      { key: 'id', header: 'ID' },
      { key: 'search_text', header: 'Search Text' },
      { key: 'title', header: 'Title' },
      { key: 'web_result_page', header: 'Web Result Page' },
      { key: 'position', header: 'Position' },
      { key: 'display_order', header: 'Display Order' },
      { key: 'is_active', header: 'Active' },
    ]);
    toast({ title: `Exported ${selectedIds.size} searches to CSV` });
  };

  const handleCopy = () => {
    const selectedData = searches.filter(s => selectedIds.has(s.id));
    const baseUrl = window.location.origin;
    const text = selectedData.map(s => {
      const blog = blogs.find(b => b.id === s.blog_id);
      const randomToken = generateRandomToken();
      return `${baseUrl}/wr/${s.web_result_page}?p=${randomToken}&n=${generateRandomToken()}&c=${generateRandomToken()}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied links to clipboard" });
  };

  const generateRandomToken = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleCopyLink = (search: RelatedSearch) => {
    const baseUrl = window.location.origin;
    const randomToken = generateRandomToken();
    const link = `${baseUrl}/wr/${search.web_result_page}?p=${randomToken}&n=${generateRandomToken()}&c=${generateRandomToken()}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  const handleBulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('related_searches')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Activated ${selectedIds.size} searches` });
      fetchSearches();
    } catch (error) {
      toast({ title: "Error activating", variant: "destructive" });
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('related_searches')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Deactivated ${selectedIds.size} searches` });
      fetchSearches();
    } catch (error) {
      toast({ title: "Error deactivating", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

    try {
      const { error } = await supabase
        .from('related_searches')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      toast({ title: `Deleted ${selectedIds.size} searches` });
      fetchSearches();
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  // Filter searches based on blog filter and search query
  const filteredSearches = searches.filter(s => {
    const matchesSearch = s.search_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedBlogFilter === 'all') return matchesSearch;
    if (selectedBlogFilter === 'none') return matchesSearch && !s.blog_id;
    return matchesSearch && s.blog_id === selectedBlogFilter;
  });

  if (loading) {
    return (
      <AdminLayout title="Categories Editor">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Categories Editor">
      <div className="space-y-6">
        {/* Blog Filter */}
        <div className="admin-card border-2 border-primary/30">
          <h3 className="text-lg font-semibold text-primary mb-4">Step 1: Select Blog</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Filter by Blog</Label>
              <Select
                value={selectedBlogFilter}
                onValueChange={(value) => {
                  setSelectedBlogFilter(value);
                  // Auto-set blog_id in form when creating new
                  if (value !== 'all' && value !== 'none' && !editingId) {
                    setFormData(prev => ({ ...prev, blog_id: value }));
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select blog to filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Related Searches</SelectItem>
                  <SelectItem value="none">Landing Page Only (No Blog)</SelectItem>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 admin-input"
          />
        </div>

        {/* Bulk Actions */}
        <BulkActionToolbar
          totalCount={filteredSearches.length}
          selectedCount={selectedIds.size}
          allSelected={selectedIds.size === filteredSearches.length && filteredSearches.length > 0}
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
            {editingId ? 'Edit Related Search' : 'Add Related Search'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Blog (optional)</Label>
              <Select
                value={formData.blog_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, blog_id: value === 'none' ? null : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select blog (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No blog (Landing page)</SelectItem>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search Text</Label>
              <Input
                value={formData.search_text}
                onChange={(e) => setFormData({ ...formData, search_text: e.target.value })}
                className="mt-1 admin-input"
                placeholder="e.g., Online Earning Platforms"
              />
            </div>
            
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 admin-input"
                placeholder="e.g., Top Online Earning Platforms"
              />
            </div>
            
            <div>
              <Label>Web Result Page (wr=)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={formData.web_result_page}
                onChange={(e) => setFormData({ ...formData, web_result_page: parseInt(e.target.value) || 1 })}
                className="mt-1 admin-input"
              />
            </div>
            
            <div>
              <Label>Position</Label>
              <Input
                type="number"
                min={1}
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
                className="mt-1 admin-input"
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
            
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
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

        {/* Existing Categories */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Existing Related Searches {selectedBlogFilter !== 'all' && `(${selectedBlogFilter === 'none' ? 'Landing Page' : blogs.find(b => b.id === selectedBlogFilter)?.title || ''})`}
          </h3>
          
          <div className="space-y-2">
            {filteredSearches.map((search) => {
              const linkedBlog = blogs.find(b => b.id === search.blog_id);
              return (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(search.id)}
                      onCheckedChange={() => toggleSelection(search.id)}
                    />
                    <div>
                      <p className="font-medium text-foreground">
                        {search.search_text}
                        {linkedBlog && (
                          <span className="text-primary ml-2">
                            [{linkedBlog.title}]
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Page: wr={search.web_result_page} | Pos: {search.position} | Order: {search.display_order}
                        {linkedBlog && ` | Blog: ${linkedBlog.title}`}
                        {!search.is_active && ' | Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyLink(search)}
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(search)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(search.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {filteredSearches.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No categories found.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
