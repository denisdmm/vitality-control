import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon.component';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="relative" (keydown)="onKey($event)">
      <button
        type="button"
        [disabled]="disabled()"
        class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        (click)="open()"
      >
        <span [class]="displayLabel() ? 'text-foreground' : 'text-muted-foreground'">
          {{ displayLabel() || placeholder() }}
        </span>
        <app-icon name="chevronDown" class="h-4 w-4 opacity-50" />
      </button>
      @if (isOpen()) {
        <div class="absolute z-50 mt-1 min-w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          @for (opt of options(); track opt.value) {
            <div
              role="option"
              [class]="opt.value === value() ? 'bg-accent text-accent-foreground' : ''"
              class="relative flex w-full cursor-default select-none items-center justify-between rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              (click)="select(opt)"
            >
              {{ opt.label }}
              @if (opt.value === value()) {
                <app-icon name="check" class="absolute right-2 h-4 w-4" />
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SelectComponent {
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('Selecione');
  readonly disabled = input(false);
  readonly value = model<string | null>(null);
  readonly isOpen = signal(false);
  private readonly el = inject(ElementRef);

  readonly displayLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );

  open(): void {
    this.isOpen.set(true);
  }

  select(opt: SelectOption): void {
    this.value.set(opt.value);
    this.isOpen.set(false);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}