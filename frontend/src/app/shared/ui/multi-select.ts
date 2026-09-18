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

export interface MultiSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-multi-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="relative" (keydown)="onKey($event)">
      <button
        type="button"
        class="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        (click)="toggleOpen()"
      >
        @if (selectedLabels().length === 0) {
          <span class="text-muted-foreground">{{ placeholder() }}</span>
        } @else {
          @for (opt of selectedLabels(); track opt.value) {
            <span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {{ opt.label }}
              <app-icon name="x" class="h-3 w-3 cursor-pointer" (click)="deselect(opt.value, $event)" />
            </span>
          }
        }
        <app-icon name="chevronsUpDown" class="ml-auto h-4 w-4 shrink-0 opacity-50" />
      </button>
      @if (isOpen()) {
        <div class="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          @for (opt of options(); track opt.value) {
            <div
              role="option"
              class="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              (click)="toggle(opt)"
            >
              <span class="flex h-4 w-4 items-center justify-center rounded-sm border"
                [class.bg-primary]="value().includes(opt.value)">
                @if (value().includes(opt.value)) {
                  <app-icon name="check" class="h-3 w-3 text-primary-foreground" />
                }
              </span>
              {{ opt.label }}
            </div>
          } @empty {
            <div class="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma opção.</div>
          }
        </div>
      }
    </div>
  `,
})
export class MultiSelectComponent {
  readonly options = input<MultiSelectOption[]>([]);
  readonly placeholder = input('Selecione...');
  readonly value = model<string[]>([]);
  readonly isOpen = signal(false);
  private readonly el = inject(ElementRef);

  readonly selectedLabels = computed(() =>
    this.options().filter((o) => this.value().includes(o.value)),
  );

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
  }

  toggle(opt: MultiSelectOption): void {
    const current = this.value();
    this.value.set(
      current.includes(opt.value)
        ? current.filter((v) => v !== opt.value)
        : [...current, opt.value],
    );
  }

  deselect(value: string, event: Event): void {
    event.stopPropagation();
    this.value.set(this.value().filter((v) => v !== value));
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
