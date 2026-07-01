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

interface YearMultiSelectProps {
  selected: string[];
  onChange: (years: string[]) => void;
  years: string[];
}

export function YearMultiSelect({ selected, onChange, years }: YearMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (year: string) => {
    onChange(selected.filter((s) => s !== year));
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
              selected.map((year) => (
                <Badge
                  key={year}
                  variant="secondary"
                  className="rounded-md bg-primary/10 text-primary hover:bg-primary/20 border-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(year);
                  }}
                >
                  {year}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Pilih Tahun</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 rounded-xl" align="start">
        <Command className="rounded-xl">
          <CommandInput placeholder="Cari tahun..." />
          <CommandList>
            <CommandEmpty>Tahun tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {years.map((year) => (
                <CommandItem
                  key={year}
                  onSelect={() => {
                    onChange(
                      selected.includes(year)
                        ? selected.filter((s) => s !== year)
                        : [...selected, year]
                    );
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(year) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {year}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}