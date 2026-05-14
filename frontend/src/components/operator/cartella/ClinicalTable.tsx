import { useState, useMemo } from 'react';
import { ClinicalTableSection } from './shared';

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
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
  noWrapper?: boolean;
}

type SortDir = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  dir: SortDir;
}

function sortRows<T extends Record<string, any>>(rows: T[], sort: SortState, col: ColumnDef<T> | undefined): T[] {
  if (!sort.dir || !col) return rows;
  return [...rows].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    let cmp = 0;
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

function filterRows<T extends Record<string, any>>(rows: T[], filters: Record<string, string>, columns: ColumnDef<T>[]): T[] {
  return rows.filter(row => {
    for (const col of columns) {
      const fv = filters[col.key];
      if (!fv) continue;
      const rv = String(row[col.key] ?? '');
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
  noWrapper = false,
}: ClinicalTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const filterableCount = columns.filter(c => c.filterable).length;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function handleSort(key: string) {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key: '', dir: null };
      return { key, dir: 'asc' };
    });
  }

  function setFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const displayData = useMemo(() => {
    const filtered = filterRows(data, filters, columns);
    const sortCol = columns.find(c => c.key === sort.key);
    return sortRows(filtered, sort, sortCol);
  }, [data, filters, columns, sort]);

  const filterBtn = filterableCount > 0 ? (
    <button
      className="btn-secondary btn-sm"
      onClick={() => setShowFilters(v => !v)}
      style={{ position: 'relative' }}
    >
      Filtri{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
    </button>
  ) : null;

  const sectionActions = (
    <>
      {filterBtn}
      {actions}
    </>
  );

  const tableContent = (
    <div className="clinicos-table-wrap">
      <table className="clinicos-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                <div className="cdt__th-inner">
                  {col.sortable ? (
                    <button
                      type="button"
                      className="cdt__sort-btn"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <span className="cdt__sort-icon">
                        {sort.key === col.key && sort.dir === 'asc' ? '▲' : sort.key === col.key && sort.dir === 'desc' ? '▼' : '⇅'}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                  {col.filterable && showFilters && (
                    <div className="cdt__filter">
                      {col.filterType === 'select' ? (
                        <select
                          className="cdt__filter-select"
                          value={filters[col.key] ?? ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        >
                          <option value="">Tutti</option>
                          {(col.options ?? []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : col.filterType === 'date' ? (
                        <input
                          type="date"
                          className="cdt__filter-input"
                          value={filters[col.key] ?? ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        />
                      ) : (
                        <input
                          type="text"
                          className="cdt__filter-input"
                          placeholder="Filtra…"
                          value={filters[col.key] ?? ''}
                          onChange={e => setFilter(col.key, e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="cdt__empty">{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            displayData.map((row, idx) => (
              <tr
                key={row[keyField] ?? idx}
                className={rowClassName ? rowClassName(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
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
      actions={sectionActions}
    >
      {tableContent}
    </ClinicalTableSection>
  );
}
