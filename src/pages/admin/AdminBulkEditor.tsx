import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Link, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ParsedRow {
  rowIndex: number;
  web_result_id?: string;
  old_url?: string;
  new_title: string;
  new_url: string;
  matchedResult?: {
    id: string;
    title: string;
    original_link: string;
  };
  status: "matched" | "not_found" | "error";
  errorMessage?: string;
  selected: boolean;
}

const AdminBulkEditor = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [updateResults, setUpdateResults] = useState<{ success: number; failed: number } | null>(null);

  // Fetch all web results for matching
  const { data: webResults = [] } = useQuery({
    queryKey: ["web-results-for-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_results")
        .select("id, title, original_link")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Helper to find column by normalized name (case-insensitive, trimmed)
  const findColumn = (row: Record<string, string>, possibleNames: string[]): string | undefined => {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const found = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
      if (found && row[found]?.toString().trim()) {
        return row[found].toString().trim();
      }
    }
    return undefined;
  };

  // Check if column exists in row
  const hasColumn = (row: Record<string, string>, possibleNames: string[]): boolean => {
    const keys = Object.keys(row);
    return possibleNames.some(name => 
      keys.some(k => k.trim().toLowerCase() === name.toLowerCase())
    );
  };

  const processJsonData = (jsonData: Record<string, string>[]) => {
    // Filter out empty rows (rows where all values are empty)
    const filteredData = jsonData.filter(row => {
      const values = Object.values(row);
      return values.some(v => v && v.toString().trim() !== "");
    });

    if (filteredData.length === 0) {
      toast({
        title: "Empty data",
        description: "No data found to process",
        variant: "destructive",
      });
      return null;
    }

    // Validate required columns (case-insensitive)
    const firstRow = filteredData[0];
    const nameVariants = ["Name"];
    const urlLinkVariants = ["Url Link", "Url_Link", "UrlLink", "URL Link"];
    const webResultTitleVariants = ["Web Result Title", "Web_Result_Title", "WebResultTitle"];
    const originalLinkVariants = ["Original Link", "Original_Link", "OriginalLink"];

    const hasNewTitle = hasColumn(firstRow, nameVariants);
    const hasNewUrl = hasColumn(firstRow, urlLinkVariants);
    const hasWebResultTitle = hasColumn(firstRow, webResultTitleVariants);
    const hasOriginalLink = hasColumn(firstRow, originalLinkVariants);

    if (!hasNewTitle || !hasNewUrl) {
      toast({
        title: "Missing required columns",
        description: "Data must contain 'Name' and 'Url Link' columns",
        variant: "destructive",
      });
      return null;
    }

    if (!hasWebResultTitle && !hasOriginalLink) {
      toast({
        title: "Missing matching column",
        description: "Data must contain either 'Web Result Title' or 'Original Link' column for matching",
        variant: "destructive",
      });
      return null;
    }

    // Parse and match rows
    const parsed: ParsedRow[] = filteredData.map((row, index) => {
      const webResultTitle = findColumn(row, webResultTitleVariants);
      const originalLink = findColumn(row, originalLinkVariants);
      const newTitle = findColumn(row, nameVariants) || "";
      const newUrl = findColumn(row, urlLinkVariants) || "";

      let matchedResult: ParsedRow["matchedResult"];
      let status: ParsedRow["status"] = "not_found";
      let errorMessage: string | undefined;

      // Try to match by title first, then by URL
      if (webResultTitle) {
        const match = webResults.find((r) => r.title.toLowerCase() === webResultTitle.toLowerCase());
        if (match) {
          matchedResult = match;
          status = "matched";
        } else {
          errorMessage = "No web result found with this title";
        }
      } else if (originalLink) {
        const match = webResults.find(
          (r) => r.original_link.toLowerCase() === originalLink.toLowerCase()
        );
        if (match) {
          matchedResult = match;
          status = "matched";
        } else {
          errorMessage = "No web result found with this URL";
        }
      }

      if (!newTitle || !newUrl) {
        status = "error";
        errorMessage = "Missing Name or Url Link";
      }

      return {
        rowIndex: index + 1,
        web_result_id: webResultTitle,
        old_url: originalLink,
        new_title: newTitle,
        new_url: newUrl,
        matchedResult,
        status,
        errorMessage,
        selected: false,
      };
    });

    return parsed;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or XLSX file",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setSheetUrl("");
    setUpdateResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const parsed = processJsonData(jsonData);
      if (parsed) {
        setParsedRows(parsed);
        const matchedCount = parsed.filter((r) => r.status === "matched").length;
        toast({
          title: "File parsed successfully",
          description: `${parsed.length} rows found, ${matchedCount} matched to existing web results`,
        });
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error parsing file",
        description: "Could not read the uploaded file",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const extractSheetId = (url: string): string | null => {
    // Match patterns like:
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    // https://docs.google.com/spreadsheets/d/SHEET_ID/
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleGoogleSheetFetch = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: "No URL provided",
        description: "Please enter a Google Sheet URL",
        variant: "destructive",
      });
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      toast({
        title: "Invalid Google Sheet URL",
        description: "Please enter a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/...)",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingSheet(true);
    setFileName("");
    setUpdateResults(null);

    try {
      // Fetch as CSV (sheet must be publicly shared)
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error("Failed to fetch sheet. Make sure it's publicly shared.");
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const parsed = processJsonData(jsonData);
      if (parsed) {
        setParsedRows(parsed);
        const matchedCount = parsed.filter((r) => r.status === "matched").length;
        toast({
          title: "Google Sheet loaded successfully",
          description: `${parsed.length} rows found, ${matchedCount} matched to existing web results`,
        });
      }
    } catch (error) {
      console.error("Error fetching Google Sheet:", error);
      toast({
        title: "Error loading Google Sheet",
        description: "Make sure the sheet is publicly shared (Anyone with the link can view)",
        variant: "destructive",
      });
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    setParsedRows((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex && row.status === "matched"
          ? { ...row, selected: !row.selected }
          : row
      )
    );
  };

  const toggleAllSelection = () => {
    const matchedRows = parsedRows.filter((r) => r.status === "matched");
    const allSelected = matchedRows.every((r) => r.selected);
    setParsedRows((prev) =>
      prev.map((row) =>
        row.status === "matched" ? { ...row, selected: !allSelected } : row
      )
    );
  };

  const applyChanges = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.matchedResult);
    if (selectedRows.length === 0) {
      toast({
        title: "No rows selected",
        description: "Please select at least one row to update",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failedCount = 0;

    for (const row of selectedRows) {
      try {
        // Store history first
        const { error: historyError } = await supabase
          .from("web_result_update_history")
          .insert({
            web_result_id: row.matchedResult!.id,
            old_title: row.matchedResult!.title,
            old_url: row.matchedResult!.original_link,
            new_title: row.new_title,
            new_url: row.new_url,
            updated_by: "admin",
          });

        if (historyError) {
          console.error("History insert error:", historyError);
        }

        // Update web result
        const { error: updateError } = await supabase
          .from("web_results")
          .update({
            title: row.new_title,
            original_link: row.new_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.matchedResult!.id);

        if (updateError) throw updateError;
        successCount++;
      } catch (error) {
        console.error("Update error:", error);
        failedCount++;
      }
    }

    setIsProcessing(false);
    setUpdateResults({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      toast({
        title: "Updates applied",
        description: `${successCount} web result(s) updated successfully${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      });
      // Clear parsed rows after successful update
      setParsedRows([]);
      setFileName("");
      setSheetUrl("");
    } else {
      toast({
        title: "Update failed",
        description: "No web results were updated",
        variant: "destructive",
      });
    }
  };

  const clearFile = () => {
    setParsedRows([]);
    setFileName("");
    setSheetUrl("");
    setUpdateResults(null);
  };

  const matchedCount = parsedRows.filter((r) => r.status === "matched").length;
  const selectedCount = parsedRows.filter((r) => r.selected).length;

  return (
    <AdminLayout title="Bulk Web Result Editor">
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Bulk Web Result Editor
            </CardTitle>
          <CardDescription>
              Upload a CSV or XLSX file to bulk update web result titles and URLs.
              Required columns: Name, Url Link, and either Web Result Title or Original Link for matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              {fileName && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{fileName}</Badge>
                  <Button variant="ghost" size="sm" onClick={clearFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google Sheet URL */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Paste Google Sheet URL..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleGoogleSheetFetch}
                disabled={isFetchingSheet || !sheetUrl.trim()}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isFetchingSheet ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {isFetchingSheet ? "Loading..." : "Load Sheet"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Google Sheet must be publicly shared (Anyone with the link can view)
            </p>

            {updateResults && (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium">
                    {updateResults.success} web result(s) updated successfully
                  </span>
                  {updateResults.failed > 0 && (
                    <span className="text-destructive">
                      ({updateResults.failed} failed)
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Changes</CardTitle>
                  <CardDescription>
                    {matchedCount} of {parsedRows.length} rows matched • {selectedCount} selected
                  </CardDescription>
                </div>
                <Button
                  onClick={applyChanges}
                  disabled={selectedCount === 0 || isProcessing}
                >
                  {isProcessing ? "Applying..." : `Apply Selected Changes (${selectedCount})`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={matchedCount > 0 && parsedRows.filter(r => r.status === "matched").every(r => r.selected)}
                          onCheckedChange={toggleAllSelection}
                          disabled={matchedCount === 0}
                        />
                      </TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Current Title</TableHead>
                      <TableHead>Current URL</TableHead>
                      <TableHead>New Title</TableHead>
                      <TableHead>New URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow
                        key={row.rowIndex}
                        className={row.status !== "matched" ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={() => toggleRowSelection(row.rowIndex)}
                            disabled={row.status !== "matched"}
                          />
                        </TableCell>
                        <TableCell>
                          {row.status === "matched" ? (
                            <Badge variant="default" className="bg-green-500">
                              Matched
                            </Badge>
                          ) : row.status === "not_found" ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Not Found
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {row.matchedResult?.title || "-"}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-muted-foreground text-sm">
                          {row.matchedResult?.original_link || row.old_url || "-"}
                        </TableCell>
                        <TableCell className="max-w-48 truncate font-medium">
                          {row.new_title}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">
                          {row.new_url}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedRows.some((r) => r.errorMessage) && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <p className="font-medium mb-2">Errors:</p>
                  <ul className="text-sm space-y-1">
                    {parsedRows
                      .filter((r) => r.errorMessage)
                      .map((r) => (
                        <li key={r.rowIndex}>
                          Row {r.rowIndex}: {r.errorMessage}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>File Format Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <div>
              <p className="font-medium text-foreground mb-2">Required Columns:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 rounded">Name</code> - The new title for the web result</li>
                <li><code className="bg-muted px-1 rounded">Url Link</code> - The new URL for the web result</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Matching Columns (at least one required):</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 rounded">Web Result Title</code> - The current title of the web result (preferred)</li>
                <li><code className="bg-muted px-1 rounded">Original Link</code> - The current URL of the web result to match</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Example CSV:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`Web Result Title,Name,Url Link
Old Title Here,New Title Here,https://example.com/new-url
Another Old Title,New Title,https://example.com/another`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBulkEditor;
