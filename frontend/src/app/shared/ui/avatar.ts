import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full' },
  template: `<ng-content />`,
})
export class AvatarComponent {}

@Component({
  selector: 'app-avatar-image',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img [src]="src()" [alt]="alt()" class="aspect-square h-full w-full object-cover" />`,
})
export class AvatarImageComponent {
  readonly src = input<string | null | undefined>(undefined);
  readonly alt = input<string>('');
}

@Component({
  selector: 'app-avatar-fallback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full items-center justify-center rounded-full bg-muted' },
  template: `<ng-content />`,
})
export class AvatarFallbackComponent {}