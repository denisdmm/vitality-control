import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="rounded-lg border bg-card text-card-foreground shadow-sm"><ng-content /></div>`,
})
export class CardComponent {}

@Component({
  selector: 'app-card-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="flex flex-col space-y-1.5 p-6"><ng-content /></div>`,
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-title',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h3 class="text-lg font-semibold leading-none tracking-tight"><ng-content /></h3>`,
})
export class CardTitleComponent {}

@Component({
  selector: 'app-card-description',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-sm text-muted-foreground"><ng-content /></p>`,
})
export class CardDescriptionComponent {}

@Component({
  selector: 'app-card-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="p-6 pt-0"><ng-content /></div>`,
})
export class CardContentComponent {}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="flex items-center p-6 pt-0"><ng-content /></div>`,
})
export class CardFooterComponent {}