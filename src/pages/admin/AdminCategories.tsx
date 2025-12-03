import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { RelatedSearch } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";

const AdminCategories = () => {
  const { toast } = useToast();
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    search_text: '',
    title: '',
    web_result_page: 1,
    position: 1,
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSearches(data as RelatedSearch[]);
    } catch (error) {
      console.error('Error fetching searches:', error);
    } finally {
      setLoading(false);
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

  const filteredSearches = searches.filter(s => 
    s.search_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Add/Edit Form */}
        <div className="admin-card">
          <h3 className="text-lg font-semibold text-primary mb-4">
            {editingId ? 'Edit Related Search' : 'Add Related Search'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Existing Related Searches
          </h3>
          
          <div className="space-y-2">
            {filteredSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
              >
                <div>
                  <p className="font-medium text-foreground">{search.search_text}</p>
                  <p className="text-sm text-muted-foreground">
                    Page: wr={search.web_result_page} | Pos: {search.position} | Order: {search.display_order}
                    {!search.is_active && ' | Inactive'}
                  </p>
                </div>
                <div className="flex gap-2">
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
            ))}
            
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
