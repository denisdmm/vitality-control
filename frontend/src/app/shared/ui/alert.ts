import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

@Component({
  selector: 'app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    [class]="cls()"
    role="alert"
  ><ng-content /></div>`,
})
export class AlertComponent {
  readonly variant = input<AlertVariant>('default');

  readonly cls = (() => {
    const map: Record<AlertVariant, string> = {
      default: 'relative w-full rounded-lg border bg-card text-card-foreground shadow-sm',
      destructive: 'relative w-full rounded-lg border border-destructive/50 text-destructive',
      warning: 'relative w-full rounded-lg border bg-amber-50 border-amber-200 text-amber-800',
      success: 'relative w-full rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800',
    };
    return () => `${map[this.variant()]} p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7`;
  })();
}

@Component({
  selector: 'app-alert-title',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h5 class="mb-1 font-medium leading-none tracking-tight"><ng-content /></h5>`,
})
export class AlertTitleComponent {}

@Component({
  selector: 'app-alert-description',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="text-sm [&_p]:leading-relaxed"><ng-content /></div>`,
})
export class AlertDescriptionComponent {}

@Component({
  selector: 'app-separator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="shrink-0 bg-border h-[1px] w-full" role="separator"></div>`,
})
export class SeparatorComponent {}