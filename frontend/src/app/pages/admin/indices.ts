import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { SharedDataService } from '../../core/shared-data.service';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardFooterComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { LabelComponent } from '../../shared/ui/input';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-admin-indices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent, CardFooterComponent,
    ButtonComponent, LabelComponent, IconComponent,
  ],
  template: `
    <app-card class="w-full max-w-4xl">
      <app-card-header>
        <app-card-title>Definir Índices de Referência</app-card-title>
        <app-card-description>Defina os valores para sinalização e alertas de saúde em todo o sistema.</app-card-description>
      </app-card-header>
      <app-card-content>
        @if (isLoading()) {
          <div class="flex h-24 items-center justify-center">
            <app-icon name="loader2" class="h-6 w-6 animate-spin" />
          </div>
        } @else {
          <div class="space-y-8">
            <section>
              <h3 class="mb-4 flex items-center gap-2 text-lg font-medium">
                <app-icon name="target" class="h-5 w-5" />Pressão Arterial
              </h3>
              <div class="grid grid-cols-1 gap-8 pl-7 md:grid-cols-2">
                <div class="space-y-4">
                  <label app-label class="font-bold text-primary">Valores Ideais (Meta)</label>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label app-label>Sistólica</label>
                      <input app-input type="number" placeholder="ex: 120" [value]="systolicIdeal()" (input)="systolicIdeal.set(inputValue($event))" />
                    </div>
                    <div class="space-y-2">
                      <label app-label>Diastólica</label>
                      <input app-input type="number" placeholder="ex: 80" [value]="diastolicIdeal()" (input)="diastolicIdeal.set(inputValue($event))" />
                    </div>
                  </div>
                </div>
                <div class="space-y-4">
                  <label app-label class="font-bold text-destructive">Limites de Atenção (Alerta)</label>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label app-label>Sistólica</label>
                      <input app-input type="number" placeholder="ex: 130" [value]="systolicLimit()" (input)="systolicLimit.set(inputValue($event))" />
                    </div>
                    <div class="space-y-2">
                      <label app-label>Diastólica</label>
                      <input app-input type="number" placeholder="ex: 90" [value]="diastolicLimit()" (input)="diastolicLimit.set(inputValue($event))" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 class="mb-4 flex items-center gap-2 text-lg font-medium">
                <app-icon name="droplets" class="h-5 w-5" />Glicemia (mg/dL)
              </h3>
              <div class="grid grid-cols-1 gap-8 pl-7 md:grid-cols-2">
                <div class="space-y-2">
                  <label app-label>Limite Pré-diabetes (Início da faixa)</label>
                  <input app-input type="number" placeholder="ex: 100" [value]="glucosePreLimit()" (input)="glucosePreLimit.set(inputValue($event))" />
                  <p class="text-xs text-muted-foreground">Valores entre este e o próximo serão sinalizados como Atenção.</p>
                </div>
                <div class="space-y-2">
                  <label app-label>Limite Diabetes (Início da faixa)</label>
                  <input app-input type="number" placeholder="ex: 126" [value]="glucoseDiabetesLimit()" (input)="glucoseDiabetesLimit.set(inputValue($event))" />
                  <p class="text-xs text-muted-foreground">Valores iguais ou superiores serão sinalizados como Perigo.</p>
                </div>
              </div>
            </section>
          </div>
        }
      </app-card-content>
      <app-card-footer class="border-t pt-6">
        <button app-button (click)="save()" [disabled]="isSaving() || isLoading()">
          @if (isSaving()) {
            <app-icon name="loader2" class="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          } @else {
            <app-icon name="save" class="mr-2 h-4 w-4" />
            Salvar Índices
          }
        </button>
      </app-card-footer>
    </app-card>
  `,
})
export class AdminIndicesComponent {
  private readonly sharedData = inject(SharedDataService);
  private readonly toast = inject(ToastService);

  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly systolicIdeal = signal('');
  readonly diastolicIdeal = signal('');
  readonly systolicLimit = signal('');
  readonly diastolicLimit = signal('');
  readonly glucosePreLimit = signal('100');
  readonly glucoseDiabetesLimit = signal('126');

  constructor() {
    void this.load();
  }

  private toStr(v: number | null | undefined, fallback = ''): string {
    return v == null ? fallback : String(v);
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const sd = await this.sharedData.get();
      this.systolicIdeal.set(this.toStr(sd.bpSystolicIdeal));
      this.diastolicIdeal.set(this.toStr(sd.bpDiastolicIdeal));
      this.systolicLimit.set(this.toStr(sd.bpSystolicLimit));
      this.diastolicLimit.set(this.toStr(sd.bpDiastolicLimit));
      this.glucosePreLimit.set(this.toStr(sd.glucosePreLimit, '100'));
      this.glucoseDiabetesLimit.set(this.toStr(sd.glucoseDiabetesLimit, '126'));
    } catch {
      this.toast.error('Erro', 'Não foi possível carregar os índices de saúde.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(): Promise<void> {
    this.isSaving.set(true);
    try {
      const num = (v: string) => (v ? Number(v) : null);
      await this.sharedData.update({
        bpSystolicIdeal: num(this.systolicIdeal()),
        bpDiastolicIdeal: num(this.diastolicIdeal()),
        bpSystolicLimit: num(this.systolicLimit()),
        bpDiastolicLimit: num(this.diastolicLimit()),
        glucosePreLimit: num(this.glucosePreLimit()) ?? 100,
        glucoseDiabetesLimit: num(this.glucoseDiabetesLimit()) ?? 126,
      });
      this.toast.success('Sucesso!', 'Os índices de saúde foram atualizados.');
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar os índices.');
    } finally {
      this.isSaving.set(false);
    }
  }
}