import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminTabs from "@/components/admin/AdminTabs";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy, ExternalLink, Sparkles, Loader2, Search } from "lucide-react";
import { exportToCSV } from "@/lib/csvExport";

interface Blog {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  category: string | null;
  content: string;
  featured_image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["Finance", "Technology", "Lifestyle", "Business", "Health", "Education"];

const AdminBlogs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatedSearches, setGeneratedSearches] = useState<string[]>([]);
  const [selectedSearches, setSelectedSearches] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    author: "",
    category: "",
    content: "",
    featured_image_url: "",
    status: "draft",
  });

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Blog[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { selectedSearchIndexes: number[] }) => {
      const { selectedSearchIndexes, ...blogData } = data;
      const { data: insertedBlog, error } = await supabase.from("blogs").insert([blogData]).select().single();
      if (error) throw error;
      
      // Create selected related searches linked to this blog
      if (selectedSearchIndexes.length > 0 && insertedBlog) {
        const searchesToInsert = selectedSearchIndexes.map((index, i) => ({
          search_text: generatedSearches[index],
          title: generatedSearches[index],
          web_result_page: i + 1, // 1, 2, 3, 4 for /wr=1, /wr=2, etc.
          position: 1,
          display_order: i,
          is_active: true,
          blog_id: insertedBlog.id, // Link to this blog so they appear on the blog page
        }));
        
        const { error: searchError } = await supabase.from("related_searches").insert(searchesToInsert);
        if (searchError) console.error("Error creating related searches:", searchError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["related-searches-blog"] });
      toast({ title: "Blog created with related searches" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating blog", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("blogs").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: "Blog updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating blog", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: "Blog deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting blog", description: error.message, variant: "destructive" });
    },
  });

  const generateImage = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Please enter a title first", variant: "destructive" });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { title: formData.title },
      });

      if (error) throw error;
      
      if (data?.image_url) {
        setFormData((prev) => ({ ...prev, featured_image_url: data.image_url }));
        toast({ title: "Image generated successfully" });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Error generating image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateContent = async (title: string, slug: string) => {
    if (!title.trim()) return;

    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-content", {
        body: { title, slug },
      });

      if (error) throw error;
      
      if (data?.content) {
        setFormData((prev) => ({ ...prev, content: data.content }));
        // Set generated related searches
        if (data?.relatedSearches && Array.isArray(data.relatedSearches)) {
          setGeneratedSearches(data.relatedSearches);
          setSelectedSearches(new Set()); // Reset selection
        }
        toast({ title: "Content & related searches generated" });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error generating content",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const toggleSearchSelection = (index: number) => {
    const newSelected = new Set(selectedSearches);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else if (newSelected.size < 4) {
      newSelected.add(index);
    } else {
      toast({ title: "You can only select up to 4 related searches", variant: "destructive" });
    }
    setSelectedSearches(newSelected);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      author: "",
      category: "",
      content: "",
      featured_image_url: "",
      status: "draft",
    });
    setEditingBlog(null);
    setGeneratedSearches([]);
    setSelectedSearches(new Set());
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      author: blog.author || "",
      category: blog.category || "",
      content: blog.content,
      featured_image_url: blog.featured_image_url || "",
      status: blog.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, selectedSearchIndexes: Array.from(selectedSearches) });
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const openBlog = (slug: string) => {
    window.open(`/blog/${slug}`, "_blank");
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
    if (checked && blogs) {
      setSelectedIds(new Set(blogs.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleExportAll = () => {
    if (!blogs) return;
    exportToCSV(blogs, 'blogs', [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'slug', header: 'Slug' },
      { key: 'author', header: 'Author' },
      { key: 'category', header: 'Category' },
      { key: 'status', header: 'Status' },
      { key: 'created_at', header: 'Created At' },
    ]);
    toast({ title: "Exported all blogs to CSV" });
  };

  const handleExportSelected = () => {
    if (!blogs) return;
    const selectedData = blogs.filter(b => selectedIds.has(b.id));
    exportToCSV(selectedData, 'blogs-selected', [
      { key: 'id', header: 'ID' },
      { key: 'title', header: 'Title' },
      { key: 'slug', header: 'Slug' },
      { key: 'author', header: 'Author' },
      { key: 'category', header: 'Category' },
      { key: 'status', header: 'Status' },
      { key: 'created_at', header: 'Created At' },
    ]);
    toast({ title: `Exported ${selectedIds.size} blogs to CSV` });
  };

  const handleCopy = () => {
    if (!blogs) return;
    const selectedData = blogs.filter(b => selectedIds.has(b.id));
    const text = selectedData.map(b => `${b.title} - ${window.location.origin}/blog/${b.slug}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleBulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ status: 'published' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: `Published ${selectedIds.size} blogs` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ title: "Error publishing", variant: "destructive" });
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ status: 'draft' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: `Set ${selectedIds.size} blogs to draft` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ title: "Error updating", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} blogs?`)) return;

    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: `Deleted ${selectedIds.size} blogs` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Panel</h1>
        <AdminTabs />

        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Blogs</h2>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Blog
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const newSlug = generateSlug(newTitle);
                        setFormData({ 
                          ...formData, 
                          title: newTitle,
                          slug: newSlug
                        });
                      }}
                      onBlur={(e) => {
                        const title = e.target.value.trim();
                        const slug = generateSlug(title);
                        // Auto-generate content only for new blogs without content
                        if (title && !editingBlog && !formData.content.trim()) {
                          generateContent(title, slug);
                        }
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="content">Content *</Label>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => generateContent(formData.title, formData.slug)}
                        disabled={isGeneratingContent || !formData.title.trim()}
                        className="flex-shrink-0"
                      >
                        {isGeneratingContent ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate AI Content
                          </>
                        )}
                      </Button>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={8}
                        required
                        placeholder={isGeneratingContent ? "Generating content..." : "Enter blog content or generate with AI..."}
                        disabled={isGeneratingContent}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="featured_image_url">Featured Image</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateImage}
                          disabled={isGeneratingImage || !formData.title.trim()}
                          className="flex-shrink-0"
                        >
                          {isGeneratingImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate AI Image
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormData({ ...formData, featured_image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=60' })}
                          className="flex-shrink-0"
                        >
                          Use Default
                        </Button>
                      </div>
                      <Input
                        id="featured_image_url"
                        value={formData.featured_image_url}
                        onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                        placeholder="Or paste image URL here..."
                      />
                      {formData.featured_image_url && (
                        <div className="mt-2">
                          <img
                            src={formData.featured_image_url}
                            alt="Preview"
                            className="max-h-40 rounded-md object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Generated Related Searches Selection */}
                  {generatedSearches.length > 0 && !editingBlog && (
                    <div>
                      <Label>Select Related Searches for Landing Page (max 4)</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Selected searches will appear on landing page and redirect to /wr=1, /wr=2, etc. Edit text as needed.
                      </p>
                      <div className="space-y-2 border rounded-md p-3">
                        {generatedSearches.map((search, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Checkbox
                              id={`search-${index}`}
                              checked={selectedSearches.has(index)}
                              onCheckedChange={() => toggleSearchSelection(index)}
                              disabled={!selectedSearches.has(index) && selectedSearches.size >= 4}
                            />
                            <Input
                              value={search}
                              onChange={(e) => {
                                const updated = [...generatedSearches];
                                updated[index] = e.target.value;
                                setGeneratedSearches(updated);
                              }}
                              className={`flex-1 text-sm ${
                                selectedSearches.has(index) ? "border-primary" : ""
                              }`}
                            />
                            {selectedSearches.has(index) && (
                              <span className="text-xs text-primary whitespace-nowrap">
                                → /wr={Array.from(selectedSearches).sort().indexOf(index) + 1}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedSearches.size}/4 selected
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingBlog ? "Update Blog" : "Create Blog"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search blogs by title, slug, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Actions */}
          <div className="mb-4">
            <BulkActionToolbar
              totalCount={blogs?.filter(b => 
                b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.category || '').toLowerCase().includes(searchQuery.toLowerCase())
              ).length || 0}
              selectedCount={selectedIds.size}
              allSelected={selectedIds.size === (blogs?.length || 0) && (blogs?.length || 0) > 0}
              onSelectAll={handleSelectAll}
              onExportAll={handleExportAll}
              onExportSelected={handleExportSelected}
              onCopy={handleCopy}
              onActivate={handleBulkActivate}
              onDeactivate={handleBulkDeactivate}
              onDelete={handleBulkDelete}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogs?.filter(b => 
                    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (b.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(blog.id)}
                          onCheckedChange={() => toggleSelection(blog.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{blog.title}</TableCell>
                      <TableCell>{blog.slug}</TableCell>
                      <TableCell>{blog.category || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            blog.status === "published"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {blog.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyLink(blog.slug)}
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openBlog(blog.slug)}
                            title="Open Blog"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(blog)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(blog.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {blogs?.filter(b => 
                    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (b.category || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? `No blogs matching "${searchQuery}"` : 'No blogs yet. Create your first blog!'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBlogs;
