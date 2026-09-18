import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IconComponent } from '../icon.component';
import { ButtonComponent } from '../ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../ui/card';

@Component({
  selector: 'app-public-campaigns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, ButtonComponent, IconComponent],
  template: `
    <app-card class="flex h-full flex-col">
      <app-card-header class="flex flex-row items-start gap-3">
        <app-icon name="megaphone" class="mt-1 h-6 w-6 text-primary" />
        <div>
          <app-card-title>Campanhas Públicas</app-card-title>
          <app-card-description>Informações de saúde e campanhas</app-card-description>
        </div>
      </app-card-header>
      <app-card-content class="flex flex-1 flex-col justify-between">
        <div>
          <img
            src="https://picsum.photos/600/400"
            alt="Campanha de vacinação"
            class="mb-4 aspect-video w-full rounded-lg object-cover"
            loading="lazy"
          />
          <h3 class="mb-2 text-lg font-semibold">Campanha de Vacinação Contra a Gripe</h3>
          <p class="mb-4 text-sm text-muted-foreground">
            Proteja-se e proteja sua família. A vacinação anual é a forma mais eficaz de prevenção contra a gripe. Procure o posto de saúde mais próximo.
          </p>
        </div>
        <button app-button variant="outline" class="mt-4 w-full">
          Saber Mais <app-icon name="arrowRight" class="ml-2 h-4 w-4" />
        </button>
      </app-card-content>
    </app-card>
  `,
})
export class PublicCampaignsComponent {}