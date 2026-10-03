/* eslint-disable @typescript-eslint/no-explicit-any -- legacy generic table accepts heterogeneous clinical DTOs */
import { SortArrow } from '../../shared/SortArrow';
import { Fragment, useState, useMemo } from 'react';
import { ClinicalTableSection } from './shared';
import { TableFilters } from '../../shared/TableFilters';
import type { TableFilterField } from '../../shared/TableFilters';

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  filterValue?: (row: T) => unknown;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface ClinicalTableProps<T extends Record<string, any> = Record<string, any>> {
  title: string;
  columns: ColumnDef<T>[];
  data: T[];
  count?: number;
  countLabel?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  emptyMessage?: string;
  keyField?: string;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  noWrapper?: boolean;
  /** When set, rows are paginated with a footer (items-per-page + page range).
   *  When omitted, all rows are shown (legacy behavior). */
  pageSize?: number;
  /** Disable local sorting when `data` is only one server page. */
  disableSorting?: boolean;
  /** Optional controlled filter bar for server-backed or domain-specific table searches. */
  filterBar?: React.ReactNode;
  /** Tap on the row (outside its buttons/links/inputs): e.g. expand the row in place. */
  onRowToggle?: (row: T) => void;
  /** Key (keyField value) of the row whose expansion is open. */
  expandedRowKey?: string | null;
  /** Content of the open expansion, rendered as a full-width row right under its row. */
  renderExpandedRow?: (row: T) => React.ReactNode;
}

/** A tap that lands on a control inside the row belongs to that control, not to the row. */
function fromInteractive(target: EventTarget | null, row: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== row) {
    if (node.matches('button, a, input, select, textarea, label, [role="button"]')) return true;
    node = node.parentElement;
  }
  return false;
}

type SortDir = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  dir: SortDir;
}

function sortRows<T extends Record<string, any>>(
  rows: T[],
  sort: SortState,
  col: ColumnDef<T> | undefined,
): T[] {
  if (!sort.dir || !col) return rows;
  return [...rows].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    let cmp: number;
    if (col.filterType === 'date') {
      cmp = String(va ?? '').localeCompare(String(vb ?? ''));
    } else if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'it');
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}

function filterRows<T extends Record<string, any>>(
  rows: T[],
  filters: Record<string, string>,
  columns: ColumnDef<T>[],
): T[] {
  return rows.filter((row) => {
    for (const col of columns) {
      const fv = filters[col.key];
      if (!fv) continue;
      const rv = String(col.filterValue ? col.filterValue(row) : (row[col.key] ?? ''));
      if (col.filterType === 'select' || col.filterType === 'date') {
        if (rv !== fv) return false;
      } else {
        if (!rv.toLowerCase().includes(fv.toLowerCase())) return false;
      }
    }
    return true;
  });
}

export function ClinicalTable<T extends Record<string, any> = Record<string, any>>({
  title,
  columns,
  data,
  count,
  countLabel,
  defaultOpen = true,
  actions,
  emptyMessage = 'Nessun dato.',
  keyField = 'id',
  rowClassName,
  onRowClick,
  noWrapper = false,
  pageSize,
  disableSorting = false,
  filterBar,
  onRowToggle,
  expandedRowKey = null,
  renderExpandedRow,
}: ClinicalTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [perPage, setPerPage] = useState<number>(pageSize ?? 0);
  const [rawPage, setPage] = useState(1);

  const filterFields: TableFilterField[] = columns
    .filter((column) => column.filterable)
    .map((column) => ({
      key: column.key,
      label: column.label,
      type: column.filterType,
      options: column.options,
    }));

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: '', dir: null };
      return { key, dir: 'asc' };
    });
  }

  // Nome del pulsante: l'ordine che il clic applicherà (crescente → decrescente → nessuno).
  function sortActionLabel(label: string, key: string) {
    const name = label.toLowerCase();
    if (sort.key !== key || !sort.dir) return `Ordina per ${name} in ordine crescente`;
    if (sort.dir === 'asc') return `Ordina per ${name} in ordine decrescente`;
    return `Togli l'ordinamento per ${name}`;
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setPage(1);
  }

  const displayData = useMemo(() => {
    const filtered = filterRows(data, filters, columns);
    const sortCol = columns.find((c) => c.key === sort.key);
    return sortRows(filtered, sort, sortCol);
  }, [data, filters, columns, sort]);

  const paginate = perPage > 0;
  const totalRows = displayData.length;
  const totalPages = paginate ? Math.max(1, Math.ceil(totalRows / perPage)) : 1;
  // Clamp during render (no effect) so a shrinking dataset never strands the page.
  const page = Math.min(rawPage, totalPages);

  const pageData = useMemo(() => {
    if (!paginate) return displayData;
    const start = (page - 1) * perPage;
    return displayData.slice(start, start + perPage);
  }, [displayData, paginate, page, perPage]);

  const tableContent = (
    <div className="cdt">
      {filterBar ??
        (filterFields.length > 0 ? (
          <TableFilters
            tableLabel={title}
            fields={filterFields}
            values={filters}
            resultCount={totalRows}
            totalCount={data.length}
            onChange={setFilter}
            onClear={clearFilters}
          />
        ) : null)}
      <div className="clinicos-table-wrap">
        <table className="clinicos-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortable && !disableSorting && sort.key === col.key && sort.dir
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  style={{
                    ...(col.width ? { width: col.width } : {}),
                    ...(col.align ? { textAlign: col.align } : {}),
                  }}
                >
                  <div className="cdt__th-inner">
                    {col.sortable && !disableSorting ? (
                      <button
                        type="button"
                        className="ds-sort cdt__sort-btn"
                        onClick={() => handleSort(col.key)}
                        aria-label={sortActionLabel(col.label, col.key)}
                        title={sortActionLabel(col.label, col.key)}
                      >
                        {col.label}
                        <SortArrow dir={sort.key === col.key ? sort.dir : null} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="cdt__empty">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => {
                const rowKey = row[keyField] ?? idx;
                const open =
                  renderExpandedRow !== undefined &&
                  expandedRowKey !== null &&
                  String(rowKey) === expandedRowKey;
                return (
                  <Fragment key={rowKey}>
                    <tr
                      className={
                        `${rowClassName ? rowClassName(row) : ''}${onRowClick || onRowToggle ? ' row--clickable' : ''}`.trim() ||
                        undefined
                      }
                      onClick={
                        onRowClick
                          ? () => onRowClick(row)
                          : onRowToggle
                            ? (event) => {
                                if (!fromInteractive(event.target, event.currentTarget))
                                  onRowToggle(row);
                              }
                            : undefined
                      }
                    >
                      {columns.map((col) => (
                        <td key={col.key} style={col.align ? { textAlign: col.align } : undefined}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="therapy-expand-row">
                        <td colSpan={columns.length}>{renderExpandedRow(row)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        {paginate && (
          <div className="cdt__pagination">
            <label className="cdt__pagesize">
              Righe
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="cdt__pageinfo">
              {totalRows === 0
                ? '0 elementi'
                : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalRows)} di ${totalRows}`}
            </span>
            <div className="cdt__pagenav">
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span className="cdt__pagecur">
                Pagina {page} di {totalPages}
              </span>
              <button
                type="button"
                className="ds-btn ds-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (noWrapper) {
    return tableContent;
  }

  return (
    <ClinicalTableSection
      title={title}
      count={count}
      countLabel={countLabel}
      defaultOpen={defaultOpen}
      actions={actions}
    >
      {tableContent}
    </ClinicalTableSection>
  );
}
