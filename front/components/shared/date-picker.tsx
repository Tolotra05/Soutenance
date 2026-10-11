'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type DatePickerProps = {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
};

export function DatePicker({ value, onChange, placeholder = 'Choisir une date', className, disabled, minDate }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value) : undefined;
  const minD = minDate ? new Date(minDate) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-input bg-transparent text-left transition-all hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            !value && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {value ? (
            <span className="font-medium">
              {format(new Date(value), 'd MMMM yyyy', { locale: fr })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date: Date | undefined) => {
            if (date) {
              onChange?.(date.toISOString());
              setOpen(false);
            }
          }}
          disabled={minD ? { before: minD } : undefined}
          locale={fr}
          showOutsideDays
          className={cn('p-3')}
          classNames={{
            months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
            month: 'space-y-4',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-sm font-semibold',
            nav: 'space-x-1 flex items-center',
            nav_button: cn(
              buttonVariants({ variant: 'outline' }),
              'h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 transition-opacity',
            ),
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse space-y-1',
            head_row: 'flex',
            head_cell: 'text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] uppercase',
            row: 'flex w-full mt-2',
            cell: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
            day: cn(
              buttonVariants({ variant: 'ghost' }),
              'h-9 w-9 p-0 font-normal rounded-md transition-all hover:bg-muted hover:scale-105 aria-selected:opacity-100',
            ),
            day_range_end: 'day-range-end',
            day_selected:
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md',
            day_today: 'ring-1 ring-primary/40 text-primary font-semibold',
            day_outside:
              'day-outside text-muted-foreground opacity-40',
            day_disabled: 'text-muted-foreground opacity-30',
            day_range_middle:
              'aria-selected:bg-accent aria-selected:text-accent-foreground',
            day_hidden: 'invisible',
          }}
          components={{
            IconLeft: () => <span className="text-muted-foreground">‹</span>,
            IconRight: () => <span className="text-muted-foreground">›</span>,
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
