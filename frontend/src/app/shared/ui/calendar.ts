import { Component, ChangeDetectionStrategy, computed, model, signal } from '@angular/core';
import { MONTHS_PT } from '../../core/dates';
import type { DateRange } from '../../core/dates';
import { IconComponent } from '../icon.component';

const WEEKDAYS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-3">
      <div class="flex justify-center pt-1 relative items-center">
        <button
          type="button"
          class="absolute left-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          (click)="prevMonth()"
        >
          <app-icon name="chevronLeft" class="h-4 w-4" />
        </button>
        <div class="text-sm font-medium">{{ monthLabel() }}</div>
        <button
          type="button"
          class="absolute right-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          (click)="nextMonth()"
        >
          <app-icon name="chevronRight" class="h-4 w-4" />
        </button>
      </div>
      <div class="mt-4 grid grid-cols-7 gap-0 text-center text-xs text-muted-foreground">
        @for (d of weekdays; track d) {
          <div class="py-1 font-medium">{{ d }}</div>
        }
      </div>
      <div class="mt-1 grid grid-cols-7 gap-0">
        @for (day of days(); track day.key) {
          <button
            type="button"
            [class]="dayCellClass(day.date)"
            (click)="pick(day.date)"
          >
            {{ day.date.getDate() }}
          </button>
        }
      </div>
      @if (mode() === 'range' && value()?.from && value()?.to) {
        <div class="mt-2 flex justify-end">
          <button type="button" class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" (click)="clear()">
            Limpar intervalo
          </button>
        </div>
      }
    </div>
  `,
  imports: [IconComponent],
})
export class CalendarComponent {
  readonly weekdays = WEEKDAYS;

  prevMonth(): void {
    this.displayMonth.set(addMonths(this.displayMonth(), -1));
  }

  nextMonth(): void {
    this.displayMonth.set(addMonths(this.displayMonth(), 1));
  }

  readonly mode = model<'single' | 'range'>('single');
  readonly value = model<DateRange | null>(null);
  readonly displayMonth = signal(startOfDay(addMonths(new Date(), 0)));

  readonly monthLabel = computed(
    () => `${MONTHS_PT[this.displayMonth().getMonth()]} de ${this.displayMonth().getFullYear()}`,
  );

  readonly days = computed(() => {
    const month = this.displayMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const cells: Date[] = [];
    const start = new Date(first);
    start.setDate(1 - startOffset);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells.map((d, i) => ({ key: `${d.toISOString()}-${i}`, date: d }));
  });

  dayCellClass(date: Date): string {
    const v = this.value();
    const today = startOfDay(new Date());
    const inMonth = date.getMonth() === this.displayMonth().getMonth();
    const base =
      'relative h-8 w-8 p-0 text-sm font-normal focus:z-10 inline-flex items-center justify-center whitespace-nowrap rounded-md transition-colors aria-selected:opacity-100';
    const dimmed = inMonth ? '' : 'text-muted-foreground opacity-40';
    let state = 'hover:bg-accent hover:text-accent-foreground';

    if (v?.from && v?.to && this.mode() === 'range') {
      const from = v.from;
      const to = v.to;
      if (date >= from && date <= to) {
        state = 'bg-primary/10 text-primary aria-selected:bg-primary aria-selected:text-primary-foreground';
        if (sameDay(date, from)) state += ' rounded-r-none bg-primary text-primary-foreground';
        if (sameDay(date, to)) state += ' rounded-l-none bg-primary text-primary-foreground';
        if (sameDay(date, from) && sameDay(date, to)) state = 'bg-primary text-primary-foreground rounded-md';
      }
    } else if (v?.from && sameDay(date, v.from)) {
      state = 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';
    }
    if (sameDay(date, today) && !state.startsWith('bg-primary')) state += ' bg-muted/50';
    return `${base} ${dimmed} ${state}`;
  }

  pick(date: Date): void {
    const v = this.value();
    if (this.mode() === 'single') {
      this.value.set({ from: date, to: undefined });
      return;
    }
    if (!v?.from || (v.from && v.to)) {
      this.value.set({ from: date, to: undefined });
      return;
    }
    // tem from, falta to
    if (date < v.from) {
      this.value.set({ from: date, to: v.from });
    } else {
      this.value.set({ from: v.from, to: date });
    }
  }

  setMonth(date: Date): void {
    this.displayMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  clear(): void {
    this.value.set(null);
  }
}