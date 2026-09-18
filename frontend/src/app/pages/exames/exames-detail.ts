import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { HealthRecordsService } from '../../core/health-records.service';
import type { HealthRecord, SubItem } from '../../models/health-record';
import { ButtonComponent } from '../../shared/ui/button';
import { CardComponent, CardContentComponent, CardDescriptionComponent, CardHeaderComponent, CardTitleComponent } from '../../shared/ui/card';
import { DialogComponent } from '../../shared/ui/dialog';
import { AlertDialogComponent } from '../../shared/ui/alert-dialog';
import { InputComponent, LabelComponent } from '../../shared/ui/input';
import { IconComponent } from '../../shared/icon.component';
import { TABLE_IMPORTS } from '../../shared/ui/table';

@Component({
  selector: 'app-exames-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent, CardHeaderComponent, CardTitleComponent, CardDescriptionComponent, CardContentComponent,
    ButtonComponent, DialogComponent, AlertDialogComponent, InputComponent, LabelComponent, IconComponent, TABLE_IMPORTS,
  ],
  template: `
    <app-card>
      <app-card-header class="flex flex-row items-center justify-between">
        <div>
          <app-card-title>Componentes do Exame</app-card-title>
          <app-card-description>Visualize e gerencie os itens individuais do seu exame.</app-card-description>
        </div>
        <button app-button size="sm" (click)="openAdd()">
          <app-icon name="plusCircle" class="mr-2 h-4 w-4" />
          Adicionar Item
        </button>
      </app-card-header>
      <app-card-content>
        @if (subItems().length > 0) {
          <table app-table>
            <thead app-table-header>
              <tr app-table-row>
                <th app-table-head>Componente</th>
                <th app-table-head>Resultado</th>
                <th app-table-head>Val. de Referência</th>
                <th app-table-head class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody app-table-body>
              @for (item of subItems(); track item.id) {
                <tr app-table-row>
                  <td app-table-cell class="font-medium">{{ item.name }}</td>
                  <td app-table-cell>{{ item.result }}</td>
                  <td app-table-cell>{{ item.reference }}</td>
                  <td app-table-cell class="space-x-1 text-right">
                    <button app-button variant="ghost" size="icon" (click)="openEdit(item)">
                      <app-icon name="pencil" class="h-4 w-4" />
                    </button>
                    <button app-button variant="ghost" size="icon" (click)="askDelete(item)">
                      <app-icon name="trash2" class="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="flex h-48 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p>Nenhum item adicionado a este exame ainda.</p>
            <p class="text-sm">Clique em "Adicionar Item" para começar.</p>
          </div>
        }
      </app-card-content>
    </app-card>

    <app-dialog [open]="modalOpen()" (close)="modalOpen.set(false)">
      <div class="p-6">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ modalMode() === 'add' ? 'Adicionar Novo Item' : 'Editar Item do Exame' }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">Insira os detalhes do componente do seu exame.</p>
      </div>
      <div class="grid gap-4 px-6 py-4">
        <div class="space-y-2">
          <label app-label>Nome do Componente</label>
          <input app-input placeholder="Ex: Colesterol LDL" [value]="itemName()" (input)="itemName.set(inputValue($event))" />
        </div>
        <div class="space-y-2">
          <label app-label>Resultado</label>
          <input app-input placeholder="Ex: 90 mg/dL" [value]="itemResult()" (input)="itemResult.set(inputValue($event))" />
        </div>
        <div class="space-y-2">
          <label app-label>Valores de Referência</label>
          <input app-input placeholder="Ex: < 100 mg/dL" [value]="itemReference()" (input)="itemReference.set(inputValue($event))" />
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 p-6">
        <button app-button variant="outline" (click)="modalOpen.set(false)">Cancelar</button>
        <button app-button (click)="handleSubmit()">Salvar</button>
      </div>
    </app-dialog>

    <app-alert-dialog [open]="deleteOpen()" (close)="deleteOpen.set(false)">
      <h2 class="text-lg font-semibold">Você tem certeza?</h2>
      <p class="text-sm text-muted-foreground">
        Esta ação não pode ser desfeita. Isso excluirá permanentemente o item do exame.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button app-button variant="outline" (click)="deleteOpen.set(false)">Cancelar</button>
        <button app-button variant="destructive" (click)="confirmDelete()">Confirmar</button>
      </div>
    </app-alert-dialog>
  `,
})
export class ExamesDetailComponent {
  private readonly healthRecords = inject(HealthRecordsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly inputValue = (e: Event) => (e.target as HTMLInputElement).value;

  readonly subItems = signal<SubItem[]>([]);
  readonly recordName = signal('');

  readonly modalOpen = signal(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  readonly currentItem = signal<SubItem | null>(null);
  readonly deleteOpen = signal(false);
  readonly itemToDelete = signal<SubItem | null>(null);

  readonly itemName = signal('');
  readonly itemResult = signal('');
  readonly itemReference = signal('');

  id = '';

  constructor() {
    const segment = this.router.url.split('/').filter(Boolean);
    this.id = segment[segment.length - 1];
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.id) return;
    try {
      const rec: HealthRecord = await this.healthRecords.findOne(this.id);
      this.recordName.set(rec.name);
      this.subItems.set(rec.subItems ?? []);
    } catch {
      this.toast.error('Erro', 'Registro de exame não encontrado.');
    }
  }

  title(): string {
    return this.recordName() || 'Carregando...';
  }

  openAdd(): void {
    this.modalMode.set('add');
    this.currentItem.set(null);
    this.itemName.set('');
    this.itemResult.set('');
    this.itemReference.set('');
    this.modalOpen.set(true);
  }

  openEdit(item: SubItem): void {
    this.modalMode.set('edit');
    this.currentItem.set(item);
    this.itemName.set(item.name);
    this.itemResult.set(item.result);
    this.itemReference.set(item.reference);
    this.modalOpen.set(true);
  }

  async handleSubmit(): Promise<void> {
    if (!this.id) return;
    if (!this.itemName() || !this.itemResult() || !this.itemReference()) {
      this.toast.error('Erro', 'Todos os campos são obrigatórios.');
      return;
    }
    try {
      const dto = { name: this.itemName(), result: this.itemResult(), reference: this.itemReference() };
      if (this.modalMode() === 'add') {
        await this.healthRecords.addSubItem(this.id, dto);
        this.toast.success('Sucesso', 'Item adicionado ao exame.');
      } else if (this.currentItem()) {
        await this.healthRecords.updateSubItem(this.id, this.currentItem()!.id, dto);
        this.toast.success('Sucesso', 'Item do exame atualizado.');
      }
      this.modalOpen.set(false);
      await this.load();
    } catch {
      this.toast.error('Erro', 'Não foi possível salvar o item do exame.');
    }
  }

  askDelete(item: SubItem): void {
    this.itemToDelete.set(item);
    this.deleteOpen.set(true);
  }

  async confirmDelete(): Promise<void> {
    const item = this.itemToDelete();
    if (this.id && item) {
      try {
        await this.healthRecords.removeSubItem(this.id, item.id);
        this.toast.success('Excluído', 'O item do exame foi removido.');
        await this.load();
      } catch {
        this.toast.error('Erro', 'Não foi possível remover o item.');
      }
    }
    this.deleteOpen.set(false);
    this.itemToDelete.set(null);
  }
}