import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Trash2, Upload, Link, Globe, Calendar, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CountryMultiSelect from "@/components/admin/CountryMultiSelect";
import * as XLSX from 'xlsx';

interface FallbackUrl {
  id: string;
  url: string;
  allowed_countries: string[];
  created_at: string;
  updated_at: string;
  display_order: number;
  is_active: boolean;
}

const AdminFallbackUrls = () => {
  const { toast } = useToast();
  const [fallbackUrls, setFallbackUrls] = useState<FallbackUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["ALL"]);
  const [sheetUrl, setSheetUrl] = useState("");
  const [isAddingFromSheet, setIsAddingFromSheet] = useState(false);

  useEffect(() => {
    fetchFallbackUrls();
  }, []);

  const fetchFallbackUrls = async () => {
    try {
      const { data, error } = await supabase
        .from('fallback_urls')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFallbackUrls(data || []);
    } catch (error) {
      console.error('Error fetching fallback URLs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch fallback URLs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addFallbackUrl = async () => {
    if (!newUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const countries = selectedCountries.length > 0 ? selectedCountries : ['ALL'];
      const maxOrder = fallbackUrls.length > 0 ? Math.max(...fallbackUrls.map(u => u.display_order)) : 0;

      const { error } = await supabase.from('fallback_urls').insert({
        url: newUrl.trim(),
        allowed_countries: countries,
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fallback URL added successfully",
      });

      setNewUrl("");
      setSelectedCountries(["ALL"]);
      fetchFallbackUrls();
    } catch (error) {
      console.error('Error adding fallback URL:', error);
      toast({
        title: "Error",
        description: "Failed to add fallback URL",
        variant: "destructive",
      });
    }
  };

  const deleteFallbackUrl = async (id: string) => {
    try {
      const { error } = await supabase.from('fallback_urls').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Fallback URL deleted successfully",
      });
      fetchFallbackUrls();
    } catch (error) {
      console.error('Error deleting fallback URL:', error);
      toast({
        title: "Error",
        description: "Failed to delete fallback URL",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('fallback_urls')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchFallbackUrls();
    } catch (error) {
      console.error('Error updating fallback URL:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row
      const headers = jsonData[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
      const urlIndex = headers.findIndex((h: string) => h.includes('url') || h.includes('link'));
      const countryIndex = headers.findIndex((h: string) => h.includes('country') || h.includes('countries') || h.includes('allowed'));

      if (urlIndex === -1) {
        toast({
          title: "Error",
          description: "No URL column found in the sheet. Please include a column with 'url' or 'link' in the header.",
          variant: "destructive",
        });
        return;
      }

      const urlsToAdd: { url: string; allowed_countries: string[] }[] = [];
      const maxOrder = fallbackUrls.length > 0 ? Math.max(...fallbackUrls.map(u => u.display_order)) : 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const url = row[urlIndex]?.toString().trim();
        
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          let countries = ['worldwide'];
          if (countryIndex !== -1 && row[countryIndex]) {
            const countryStr = row[countryIndex].toString();
            countries = countryStr.split(',').map((c: string) => c.trim()).filter((c: string) => c);
            if (countries.length === 0) countries = ['worldwide'];
          }
          urlsToAdd.push({ url, allowed_countries: countries });
        }
      }

      if (urlsToAdd.length === 0) {
        toast({
          title: "Error",
          description: "No valid URLs found in the sheet. URLs must start with http:// or https://",
          variant: "destructive",
        });
        return;
      }

      // Insert all URLs
      const insertData = urlsToAdd.map((item, index) => ({
        url: item.url,
        allowed_countries: item.allowed_countries,
        display_order: maxOrder + index + 1,
      }));

      const { error } = await supabase.from('fallback_urls').insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${urlsToAdd.length} fallback URLs from sheet`,
      });

      fetchFallbackUrls();
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "Failed to process the uploaded file",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSheetUrlSubmit = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    setIsAddingFromSheet(true);

    try {
      // Convert Google Sheet URL to CSV export URL
      let csvUrl = sheetUrl;
      
      if (sheetUrl.includes('docs.google.com/spreadsheets')) {
        // Extract sheet ID and convert to CSV export URL
        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const sheetId = match[1];
          csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        }
      }

      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch sheet data');
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Find header row
      const headers = jsonData[0]?.map((h: any) => String(h).toLowerCase().trim()) || [];
      const urlIndex = headers.findIndex((h: string) => h.includes('url') || h.includes('link'));
      const countryIndex = headers.findIndex((h: string) => h.includes('country') || h.includes('countries') || h.includes('allowed'));

      if (urlIndex === -1) {
        toast({
          title: "Error",
          description: "No URL column found in the sheet",
          variant: "destructive",
        });
        return;
      }

      const urlsToAdd: { url: string; allowed_countries: string[] }[] = [];
      const maxOrder = fallbackUrls.length > 0 ? Math.max(...fallbackUrls.map(u => u.display_order)) : 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const url = row[urlIndex]?.toString().trim();
        
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          let countries = ['worldwide'];
          if (countryIndex !== -1 && row[countryIndex]) {
            const countryStr = row[countryIndex].toString();
            countries = countryStr.split(',').map((c: string) => c.trim()).filter((c: string) => c);
            if (countries.length === 0) countries = ['worldwide'];
          }
          urlsToAdd.push({ url, allowed_countries: countries });
        }
      }

      if (urlsToAdd.length === 0) {
        toast({
          title: "Error",
          description: "No valid URLs found in the sheet",
          variant: "destructive",
        });
        return;
      }

      // Insert all URLs
      const insertData = urlsToAdd.map((item, index) => ({
        url: item.url,
        allowed_countries: item.allowed_countries,
        display_order: maxOrder + index + 1,
      }));

      const { error } = await supabase.from('fallback_urls').insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${urlsToAdd.length} fallback URLs from Google Sheet`,
      });

      setSheetUrl("");
      fetchFallbackUrls();
    } catch (error) {
      console.error('Error processing Google Sheet:', error);
      toast({
        title: "Error",
        description: "Failed to fetch or process the Google Sheet. Make sure it's publicly accessible.",
        variant: "destructive",
      });
    } finally {
      setIsAddingFromSheet(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout title="Fallback URLs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Fallback URLs</h1>
        </div>

        {/* Add New URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Fallback URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="admin-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Allowed Countries</Label>
                <CountryMultiSelect
                  value={selectedCountries}
                  onChange={setSelectedCountries}
                  placeholder="Select countries..."
                />
              </div>
            </div>
            <Button onClick={addFallbackUrl}>
              <Plus className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </CardContent>
        </Card>

        {/* Upload from Sheet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import from Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload Excel/CSV File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="admin-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sheet should have columns: URL, Allowed Countries (comma-separated)
                </p>
              </div>

              {/* Google Sheet URL */}
              <div className="space-y-2">
                <Label>Or Google Sheet URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="admin-input flex-1"
                  />
                  <Button onClick={handleSheetUrlSubmit} disabled={isAddingFromSheet}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isAddingFromSheet ? "Loading..." : "Import"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure the Google Sheet is publicly accessible (Anyone with the link can view)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Fallback URLs ({fallbackUrls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : fallbackUrls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No fallback URLs added yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Allowed Countries</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fallbackUrls.map((url, index) => (
                    <TableRow key={url.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a 
                          href={url.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {url.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {url.allowed_countries.map((country, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded"
                            >
                              <Globe className="h-3 w-3" />
                              {country}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(url.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={url.is_active}
                          onCheckedChange={(checked) => toggleActive(url.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFallbackUrl(url.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminFallbackUrls;
