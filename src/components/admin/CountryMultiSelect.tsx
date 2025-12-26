import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COUNTRIES } from "@/types/database";
import { cn } from "@/lib/utils";

interface CountryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const CountryMultiSelect = ({ value, onChange, placeholder = "Select countries..." }: CountryMultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = COUNTRIES.filter(country =>
    country.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCountry = (country: string) => {
    if (country === "ALL") {
      // If ALL is selected, clear other selections and only keep ALL
      if (value.includes("ALL")) {
        onChange([]);
      } else {
        onChange(["ALL"]);
      }
    } else {
      // If selecting a specific country, remove ALL if present
      let newValue = value.filter(v => v !== "ALL");
      
      if (newValue.includes(country)) {
        newValue = newValue.filter(v => v !== country);
      } else {
        newValue = [...newValue, country];
      }
      onChange(newValue);
    }
  };

  const removeCountry = (country: string) => {
    onChange(value.filter(v => v !== country));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap gap-1 min-h-[40px] p-2 border border-input rounded-md bg-background cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          value.map(country => (
            <Badge key={country} variant="secondary" className="flex items-center gap-1">
              {country}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCountry(country);
                }}
              />
            </Badge>
          ))
        )}
        <ChevronDown className="h-4 w-4 ml-auto self-center text-muted-foreground" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="py-1">
            {filteredCountries.map(country => (
              <div
                key={country}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent",
                  value.includes(country) && "bg-accent"
                )}
                onClick={() => toggleCountry(country)}
              >
                <div className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  value.includes(country) ? "bg-primary border-primary" : "border-input"
                )}>
                  {value.includes(country) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={cn(
                  "text-sm",
                  country === "ALL" && "font-semibold"
                )}>
                  {country === "ALL" ? "ALL (Worldwide)" : country}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryMultiSelect;