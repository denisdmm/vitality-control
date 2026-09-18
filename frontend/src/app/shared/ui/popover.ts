import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
} from '@angular/core';

/**
 * Popover simples: trigger pela projeção `trigger`, painel pela projeção `panel`.
 * Controle opcional de abertura: `[open]="sig" (openChange)="..."`.
 */
@Component({
  selector: 'app-popover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-block">
      <div (click)="toggle()"><ng-content select="[slot=trigger]" /></div>
      @if (open()) {
        <div class="absolute left-0 z-50 mt-2 rounded-md border bg-popover text-popover-foreground shadow-md {{ panelClass() }}">
          <ng-content select="[slot=panel]" />
        </div>
      }
    </div>
  `,
})
export class PopoverComponent {
  readonly panelClass = input('w-72');
  readonly open = model(false);

  private readonly el = inject(ElementRef);

  toggle(): void {
    this.open.set(!this.open());
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}