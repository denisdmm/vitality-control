import { Component, ChangeDetectionStrategy, input, model } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="checked()"
      [class]="checked() ? 'border-primary bg-primary text-primary-foreground' : ''"
      class="peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      (click)="checked.set(!checked())"
    >
      @if (checked()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="h-3 w-3 mx-auto">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      }
    </button>
  `,
})
export class CheckboxComponent {
  readonly checked = model(false);
  readonly label = input('');
  readonly disabled = input(false);
  readonly name = input('');
}