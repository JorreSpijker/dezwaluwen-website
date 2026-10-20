// Omzetten tussen trainingstijden.json (slots met eigen dag/locatie) en de tabel in /cms (één cel per kolom).
export type Slot = { day: string; location?: string; time: string; field?: string; note?: string };
export type Column = { day: string; location?: string };
export type FileSchedule = { title: string; start: string; columns: Column[]; groups: { title: string; rows: { team: string; slots: Slot[] }[] }[]; note: string };

export type Cell = { time: string; field: string; note: string };
export type Row = { team: string; cells: Cell[] };
export type Schedule = { title: string; start: string; note: string; columns: Column[]; groups: { title: string; rows: Row[] }[] };

export const emptyCell = (): Cell => ({ time: '', field: '', note: '' });
const sameColumn = (a: Column, b: Column) => a.day === b.day && (a.location ?? '') === (b.location ?? '');

export function fromFile(s: FileSchedule): Schedule {
  return {
    title: s.title,
    start: s.start,
    note: s.note,
    columns: s.columns,
    groups: s.groups.map((g) => ({
      title: g.title,
      rows: g.rows.map((r) => ({
        team: r.team,
        cells: s.columns.map((c) => {
          const slot = r.slots.find((x) => sameColumn(x, c));
          return slot ? { time: slot.time, field: slot.field ?? '', note: slot.note ?? '' } : emptyCell();
        }),
      })),
    })),
  };
}

// Lege tijd = geen training; lege optionele velden weglaten
export function toFile(s: Schedule): FileSchedule {
  const column = (c: Column): Column => (c.location ? { day: c.day, location: c.location } : { day: c.day });
  return {
    title: s.title,
    start: s.start,
    columns: s.columns.map(column),
    groups: s.groups.map((g) => ({
      title: g.title,
      rows: g.rows.map((r) => ({
        team: r.team,
        slots: r.cells.flatMap((cell, i) =>
          cell.time.trim()
            ? [{ ...column(s.columns[i]), time: cell.time.trim(), ...(cell.field.trim() && { field: cell.field.trim() }), ...(cell.note.trim() && { note: cell.note.trim() }) }]
            : [],
        ),
      })),
    })),
    note: s.note,
  };
}
