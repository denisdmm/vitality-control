import { Component, ChangeDetectionStrategy, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" (click)="onBackdrop($event)">
        <div class="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg" role="alertdialog">
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class AlertDialogComponent {
  readonly open = input(false);
  readonly close = output<void>();

  onBackdrop(event: Event): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}