'use client';

import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters: {
    key: string;
    value: string;
    onChange: (v: string) => void;
    options: FilterOption[];
    placeholder?: string;
  }[];
  className?: string;
}

export function FilterBar({ search, onSearchChange, searchPlaceholder = 'Rechercher...', filters, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl bg-card border border-border shadow-sm', className)}>
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-8 py-2 text-sm rounded-lg bg-muted/40 border border-transparent focus:border-border focus:bg-card transition-all outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {filters.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="w-full sm:w-[160px] flex-shrink-0">
            <SelectValue placeholder={f.placeholder ?? 'Filtrer'} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
