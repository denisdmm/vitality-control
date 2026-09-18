import {
  Component,
  ChangeDetectionStrategy,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon.component';
import { InputComponent } from './input';

export interface ComboboxOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-combobox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, InputComponent],
  template: `
    <div class="relative" (keydown)="onKey($event)">
      <div class="relative">
<input
          app-input
          class="pr-8"
          [placeholder]="placeholder()"
          [value]="displayValue()"
          (focus)="openPanel()"
          (input)="onInput($event)"
        />
        <app-icon name="chevronsUpDown" class="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      </div>
      @if (isOpen()) {
        <div class="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          @if (filtered().length > 0) {
            @for (opt of filtered(); track opt.value) {
              <div
                role="option"
                class="relative flex w-full cursor-default select-none items-center justify-between rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                (mousedown)="select(opt)"
              >
                {{ opt.label }}
              </div>
            }
          } @else {
            <div class="px-2 py-1.5 text-sm text-muted-foreground">
              {{ emptyText() }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ComboboxComponent {
  readonly options = input<ComboboxOption[]>([]);
  readonly placeholder = input('');
  readonly emptyText = input('Nenhuma opção.');
  readonly value = model<string>('');

  readonly isOpen = signal(false);
  readonly query = signal('');
  private readonly el = inject(ElementRef);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  });

  readonly displayValue = computed(() => {
    const v = this.value();
    if (!v) return this.query();
    return this.options().find((o) => o.value === v)?.label ?? v;
  });

  openPanel(): void {
    this.query.set('');
    this.isOpen.set(true);
  }

  onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.query.set(v);
    this.isOpen.set(true);
  }

  /** Seleciona uma opção (ou aceita texto livre quando não casa com nenhuma). */
  select(opt: ComboboxOption): void {
    this.value.set(opt.value);
    this.isOpen.set(false);
  }

  selectRaw(text: string): void {
    this.value.set(text);
    this.isOpen.set(false);
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
    } else if (event.key === 'Enter') {
      const text = this.query().trim();
      if (text) this.selectRaw(text);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.isOpen() && !this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}