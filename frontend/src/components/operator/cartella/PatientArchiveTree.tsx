import { useState } from 'react';
import {
  ARCHIVE_CATEGORIES,
  DOCUMENT_TYPE_LABELS,
  documentCategory,
  type ArchiveCategory,
  type ArchiveEntry,
  type ArchiveFolder,
} from '../../../lib/patientDocumentArchive';

function FolderIcon({ open = false }: { open?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d={open ? 'M3 8V5h7l2 3h9v12H3V8Zm0 3h18' : 'M3 6h7l2 3h9v11H3z'} />
    </svg>
  );
}

export function PatientArchiveTree({
  entries,
  selected,
  complete,
  onSelect,
}: {
  entries: ArchiveEntry[];
  selected: ArchiveFolder;
  complete: boolean;
  onSelect: (folder: ArchiveFolder) => void;
}) {
  const [expanded, setExpanded] = useState<ArchiveCategory[]>([]);
  const count = (value: number) =>
    complete && <span className="patient-archive-tree__count">{value}</span>;
  return (
    <nav className="patient-archive-tree no-print" aria-label="Cartelle documenti">
      <h3>Cartelle</h3>
      <button
        type="button"
        className="patient-archive-tree__folder"
        aria-current={selected.category === 'tutti' ? 'location' : undefined}
        onClick={() => onSelect({ category: 'tutti' })}
      >
        <FolderIcon open /> <span>Tutti i documenti</span>
        {count(entries.length)}
      </button>
      <ul>
        {ARCHIVE_CATEGORIES.map((category) => {
          const branch = entries.filter((entry) => documentCategory(entry.type) === category.id);
          const hasChildren = category.types.length > 1;
          const open = expanded.includes(category.id);
          const active = selected.category === category.id;
          return (
            <li key={category.id}>
              <div className="patient-archive-tree__row">
                {hasChildren ? (
                  <button
                    type="button"
                    className="patient-archive-tree__toggle"
                    aria-label={`${open ? 'Chiudi' : 'Espandi'} ${category.label}`}
                    aria-expanded={open}
                    aria-controls={`archive-folder-${category.id}`}
                    onClick={() =>
                      setExpanded((current) =>
                        open
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id],
                      )
                    }
                  >
                    <span aria-hidden="true">{open ? '⌄' : '›'}</span>
                  </button>
                ) : (
                  <span className="patient-archive-tree__spacer" />
                )}
                <button
                  type="button"
                  className="patient-archive-tree__folder"
                  aria-current={active && !selected.type ? 'location' : undefined}
                  onClick={() => {
                    onSelect({ category: category.id });
                    if (hasChildren && !open) setExpanded((current) => [...current, category.id]);
                  }}
                >
                  <FolderIcon open={active || open} />
                  <span>{category.label}</span>
                  {count(branch.length)}
                </button>
              </div>
              {hasChildren && (
                <ul id={`archive-folder-${category.id}`} hidden={!open}>
                  {category.types.map((type) => (
                    <li key={type}>
                      <button
                        type="button"
                        className="patient-archive-tree__folder patient-archive-tree__leaf"
                        aria-current={active && selected.type === type ? 'location' : undefined}
                        onClick={() => onSelect({ category: category.id, type })}
                      >
                        <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                        {count(branch.filter((entry) => entry.type === type).length)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
