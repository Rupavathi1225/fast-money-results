import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
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
  const [fileName, setFileName] = useState<string>("");
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
    setUpdateResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Empty file",
          description: "The uploaded file contains no data",
          variant: "destructive",
        });
        return;
      }

      // Validate required columns
      const firstRow = jsonData[0];
      const hasNewTitle = "new_title" in firstRow;
      const hasNewUrl = "new_url" in firstRow;
      const hasWebResultId = "web_result_id" in firstRow;
      const hasOldUrl = "old_url" in firstRow;

      if (!hasNewTitle || !hasNewUrl) {
        toast({
          title: "Missing required columns",
          description: "File must contain 'new_title' and 'new_url' columns",
          variant: "destructive",
        });
        return;
      }

      if (!hasWebResultId && !hasOldUrl) {
        toast({
          title: "Missing matching column",
          description: "File must contain either 'web_result_id' or 'old_url' column for matching",
          variant: "destructive",
        });
        return;
      }

      // Parse and match rows
      const parsed: ParsedRow[] = jsonData.map((row, index) => {
        const webResultId = row.web_result_id?.trim();
        const oldUrl = row.old_url?.trim();
        const newTitle = row.new_title?.trim() || "";
        const newUrl = row.new_url?.trim() || "";

        let matchedResult: ParsedRow["matchedResult"];
        let status: ParsedRow["status"] = "not_found";
        let errorMessage: string | undefined;

        // Try to match by ID first, then by URL
        if (webResultId) {
          const match = webResults.find((r) => r.id === webResultId);
          if (match) {
            matchedResult = match;
            status = "matched";
          } else {
            errorMessage = "No web result found with this ID";
          }
        } else if (oldUrl) {
          const match = webResults.find(
            (r) => r.original_link.toLowerCase() === oldUrl.toLowerCase()
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
          errorMessage = "Missing new_title or new_url";
        }

        return {
          rowIndex: index + 1,
          web_result_id: webResultId,
          old_url: oldUrl,
          new_title: newTitle,
          new_url: newUrl,
          matchedResult,
          status,
          errorMessage,
          selected: false,
        };
      });

      setParsedRows(parsed);

      const matchedCount = parsed.filter((r) => r.status === "matched").length;
      toast({
        title: "File parsed successfully",
        description: `${parsed.length} rows found, ${matchedCount} matched to existing web results`,
      });
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
              Required columns: new_title, new_url, and either web_result_id or old_url for matching.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <li><code className="bg-muted px-1 rounded">new_title</code> - The new title for the web result</li>
                <li><code className="bg-muted px-1 rounded">new_url</code> - The new URL for the web result</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Matching Columns (at least one required):</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 rounded">web_result_id</code> - The UUID of the web result (preferred)</li>
                <li><code className="bg-muted px-1 rounded">old_url</code> - The current URL of the web result to match</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Example CSV:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`web_result_id,new_title,new_url
abc-123-def,New Title Here,https://example.com/new-url
,Old URL Match Title,https://example.com/another`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBulkEditor;
