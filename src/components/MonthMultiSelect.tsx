"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MonthMultiSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  months: string[];
}

export function MonthMultiSelect({ selected, onChange, months }: MonthMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white rounded-xl border-primary/20 min-h-[40px] h-auto py-2"
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((monthIdx) => (
                <Badge
                  key={monthIdx}
                  variant="secondary"
                  className="rounded-md bg-primary/10 text-primary border-none hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(monthIdx);
                  }}
                >
                  {months[parseInt(monthIdx)]}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(monthIdx);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(monthIdx)}
                  >
                    <X className="h-3 w-3 text-primary" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Pilih Bulan...</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 rounded-xl border-primary/10 shadow-xl">
        <Command>
          <CommandInput placeholder="Cari bulan..." />
          <CommandList>
            <CommandEmpty>Bulan tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {months.map((month, index) => (
                <CommandItem
                  key={index}
                  value={month}
                  onSelect={() => {
                    const val = index.toString();
                    onChange(
                      selected.includes(val)
                        ? selected.filter((item) => item !== val)
                        : [...selected, val]
                    );
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(index.toString()) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {month}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}