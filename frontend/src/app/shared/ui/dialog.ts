import { Component, ChangeDetectionStrategy, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open() || always()) {
      <div
        class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 sm:py-8"
        (click)="onBackdrop($event)"
      >
        <div
          class="w-full rounded-lg border bg-background text-popover-foreground shadow-lg {{ panelClass() }}"
          role="dialog"
        >
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class DialogComponent {
  /** Controla a abertura (fechar emite `close`). */
  readonly open = input(false);
  /** Quando true, renderiza sempre (o conteúdo decide visibilidade). */
  readonly always = input(false);
  readonly panelClass = input('sm:max-w-lg');
  readonly close = output<void>();

  onBackdrop(event: Event): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}