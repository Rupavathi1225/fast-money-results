import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Copy, CheckCircle, XCircle, Trash2 } from "lucide-react";

interface BulkActionToolbarProps {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onExportAll: () => void;
  onExportSelected: () => void;
  onCopy: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  showActivate?: boolean;
}

const BulkActionToolbar = ({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAll,
  onExportAll,
  onExportSelected,
  onCopy,
  onActivate,
  onDeactivate,
  onDelete,
  showActivate = true,
}: BulkActionToolbarProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap p-3 bg-secondary/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected && totalCount > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onExportAll}>
          <Download className="w-4 h-4 mr-1" />
          Export All CSV
        </Button>

        {selectedCount > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={onExportSelected}>
              <Download className="w-4 h-4 mr-1" />
              Export Selected ({selectedCount})
            </Button>

            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>

            {showActivate && (
              <>
                <Button variant="outline" size="sm" onClick={onActivate} className="text-green-500 border-green-500/30 hover:bg-green-500/10">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Activate
                </Button>

                <Button variant="outline" size="sm" onClick={onDeactivate} className="text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10">
                  <XCircle className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
              </>
            )}

            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedCount})
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkActionToolbar;
