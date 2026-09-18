import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  computed,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import type { TooltipItem } from 'chart.js';

Chart.register(...registerables);

export interface LineSeries {
  label: string;
  color: string;
  data: (number | null)[];
}

export interface LineChartOptions {
  labels: string[];
  /** Rótulos completos para o tooltip (ex.: "ter., 16 de setembro"). */
  fullLabels?: string[];
  series: LineSeries[];
  showLegend?: boolean;
  xRotate?: number;
  xFontSize?: number;
  ySuggestedMin?: number;
  ySuggestedMax?: number;
  yStep?: number;
  pointRadius?: number;
  /** Altura do contêiner em px. */
  height?: number;
  compressed?: boolean;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full" [style.height.px]="height()">
      <canvas #canvas></canvas>
    </div>
  `,
})
export class LineChartComponent implements OnDestroy {
  readonly options = input<LineChartOptions | null>(null);
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  readonly height = computed(() => this.options()?.height ?? 300);

  constructor() {
    effect(() => {
      const opts = this.options();
      const el = this.canvas();
      if (opts && el) {
        this.render(opts, el.nativeElement);
      }
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(opts: LineChartOptions, canvas: HTMLCanvasElement): void {
    const compressed = opts.compressed === true;
    const xFont = opts.xFontSize ?? (compressed ? 9 : 12);
    const pointRadius = opts.pointRadius ?? (compressed ? 2 : 4);
    const datasets = opts.series.map((s) => ({
      label: s.label,
      data: s.data.map((v) => (v == null ? null : v)),
      borderColor: s.color,
      backgroundColor: s.color + '26',
      borderWidth: compressed ? 2 : 2.5,
      pointRadius,
      pointHoverRadius: Math.max(pointRadius, 3),
      tension: 0.3,
      fill: false,
    }));

    const fullLabels = opts.fullLabels ?? opts.labels;

    // O chart.js tem tipos muito rígidos para reatribuições; tipamos via `never`.
    if (!this.chart) {
      this.chart = new Chart(canvas, {
        type: 'line',
        data: { labels: opts.labels, datasets },
      } as never);
    } else {
      this.chart.data.labels = opts.labels;
      this.chart.data.datasets = datasets as never;
    }

    const baseScales = {
      ticks: {
        color: '#a1a1aa',
        font: { size: xFont },
        ...(opts.yStep ? { stepSize: opts.yStep } : {}),
      },
      grid: { color: 'rgba(0,0,0,.06)' },
    };

    this.chart.options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: opts.showLegend !== false,
          position: 'bottom',
          labels: { boxWidth: 12, boxHeight: 12, padding: 16, font: { size: xFont } },
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,27,.92)',
          titleColor: '#fff',
          bodyColor: '#e4e4e7',
          padding: 10,
          cornerRadius: 6,
          titleFont: { size: 12 },
          bodyFont: { size: 12 },
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const idx = items[0]?.dataIndex;
              return idx == null ? '' : fullLabels[idx] ?? '';
            },
            label: (item: TooltipItem<'line'>) => {
              const v = (item.raw as number | null) ?? 0;
              return ` ${item.dataset.label ?? ''}: ${v}`.trim();
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#a1a1aa',
            maxRotation: opts.xRotate ?? 0,
            autoSkip: true,
            maxTicksLimit: compressed ? 12 : 7,
            font: { size: xFont },
          },
          grid: { display: false },
        },
        y: {
          suggestedMin: opts.ySuggestedMin,
          suggestedMax: opts.ySuggestedMax,
          ...baseScales,
        },
      },
    } as never;
    this.chart.update();
  }
}