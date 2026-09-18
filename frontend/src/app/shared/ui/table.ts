import { Directive } from '@angular/core';

@Directive({
  selector: 'table[app-table]',
  standalone: true,
  host: { class: 'w-full caption-bottom text-sm' },
})
export class TableDirective {}

@Directive({
  selector: 'thead[app-table-header]',
  standalone: true,
  host: { class: '[&_tr]:border-b' },
})
export class TableHeaderDirective {}

@Directive({
  selector: 'tbody[app-table-body]',
  standalone: true,
  host: { class: '[&_tr:last-child]:border-0' },
})
export class TableBodyDirective {}

@Directive({
  selector: 'tr[app-table-row]',
  standalone: true,
  host: {
    class: 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
  },
})
export class TableRowDirective {}

@Directive({
  selector: 'th[app-table-head]',
  standalone: true,
  host: {
    class: 'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
  },
})
export class TableHeadDirective {}

@Directive({
  selector: 'td[app-table-cell]',
  standalone: true,
  host: {
    class: 'p-2 align-middle [&:has([role=checkbox])]:pr-0',
  },
})
export class TableCellDirective {}

export const TABLE_IMPORTS = [
  TableDirective,
  TableHeaderDirective,
  TableBodyDirective,
  TableRowDirective,
  TableHeadDirective,
  TableCellDirective,
];
