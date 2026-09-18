import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center py-10 text-muted-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="animate-spin {{ sizeClass() }}">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      @if (label()) {
        <span class="ml-3 text-sm">{{ label() }}</span>
      }
    </div>
  `,
})
export class SpinnerComponent {
  readonly label = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-8 w-8';
      default:
        return 'h-6 w-6';
    }
  });
}