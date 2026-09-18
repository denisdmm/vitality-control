import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.html',
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] ?? 'Página';
  readonly description =
    this.route.snapshot.data['description'] ??
    'Tela prevista na Fase 4 (port pass-a-a-pass do legado).';
}