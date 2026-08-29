export const MAX_STAFF_RESULTS = 100;

export interface StaffListRow {
  ruolo: string | null;
  qualifica: string | null;
  department: string | null;
  user: {
    fullName: string;
    isActive: boolean;
  };
}

export interface StaffListItem {
  fullName: string;
  ruolo: string | null;
  qualifica: string | null;
  reparto: string | null;
  stato: 'attivo' | 'inattivo';
}

export function boundStaffList(rows: readonly StaffListRow[]): {
  data: StaffListItem[];
  truncated: boolean;
} {
  const truncated = rows.length > MAX_STAFF_RESULTS;
  const window = truncated ? rows.slice(0, MAX_STAFF_RESULTS) : rows;
  return {
    data: window.map((row) => ({
      fullName: row.user.fullName,
      ruolo: row.ruolo,
      qualifica: row.qualifica,
      reparto: row.department,
      stato: row.user.isActive ? 'attivo' : 'inattivo',
    })),
    truncated,
  };
}
