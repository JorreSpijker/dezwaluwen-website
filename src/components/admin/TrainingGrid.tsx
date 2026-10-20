// Trainingstijden bewerken als spreadsheet (react-datasheet-grid): per groep een tabel, teams als rijen,
// per dag de kolommen Tijd, Veld en Opmerking. Kopiëren/plakken uit Excel of Google Sheets werkt.
import { useState } from 'react';
import {
  DataSheetGrid,
  createAddRowsComponent,
  createContextMenuComponent,
  keyColumn,
  textColumn,
  type Column as GridColumn,
  type ContextMenuItem,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { save, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { useUnsavedWarning } from './unsaved';
import './form.css';
import './grid.css';
import { emptyCell, fromFile, toFile, type Column, type FileSchedule, type Row, type Schedule } from './training';

type Data = Record<'veld' | 'zaal', Schedule>;
// Eén regel in de spreadsheet: team + per kolom i de velden t{i} (tijd), f{i} (veld), n{i} (opmerking)
type FlatRow = Record<string, string | null>;

const toFlat = (rows: Row[]): FlatRow[] =>
  rows.map((r) => Object.fromEntries([['team', r.team], ...r.cells.flatMap((c, i) => [[`t${i}`, c.time], [`f${i}`, c.field], [`n${i}`, c.note]])]));

const fromFlat = (rows: FlatRow[], columns: number): Row[] =>
  rows.map((r) => ({
    team: r.team ?? '',
    cells: Array.from({ length: columns }, (_, i) => ({ time: r[`t${i}`] ?? '', field: r[`f${i}`] ?? '', note: r[`n${i}`] ?? '' })),
  }));

const isEmpty = (r: Row) => !r.team.trim() && r.cells.every((c) => !c.time.trim() && !c.field.trim() && !c.note.trim());

// Element verplaatsen binnen een lijst (geeft nieuwe lijst)
const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
};

const AddRows = createAddRowsComponent({ button: 'Toevoegen', unit: 'teams' });
const contextLabels: Record<ContextMenuItem['type'], string> = {
  INSERT_ROW_BELLOW: 'Team eronder invoegen',
  DELETE_ROW: 'Team verwijderen',
  DUPLICATE_ROW: 'Team dupliceren',
  DELETE_ROWS: 'Teams verwijderen',
  DUPLICATE_ROWS: 'Teams dupliceren',
  COPY: 'Kopiëren',
  CUT: 'Knippen',
  PASTE: 'Plakken',
};
const ContextMenu = createContextMenuComponent((item) => <>{contextLabels[item.type]}</>);

const head = (title: string, sub: string) => (
  <span className="grid-head">
    <b>{title}</b>
    <small>{sub}</small>
  </span>
);

type Props = { path: string; sha: string; data: Record<'veld' | 'zaal', FileSchedule>; days: readonly string[] };

export default function TrainingGrid({ path, sha: initialSha, data: initialData, days }: Props) {
  const [data, setData] = useState<Data>({ veld: fromFile(initialData.veld), zaal: fromFile(initialData.zaal) });
  const [tab, setTab] = useState<keyof Data>('veld');
  const [sha, setSha] = useState(initialSha);
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const markSaved = useUnsavedWarning(JSON.stringify(data));
  const s = data[tab];

  const update = (fn: (s: Schedule) => Schedule) => {
    setData((d) => ({ ...d, [tab]: fn(d[tab]) }));
    setState({ status: 'idle' });
  };
  const setGroups = (fn: (groups: Schedule['groups']) => Schedule['groups']) => update((s) => ({ ...s, groups: fn(s.groups) }));
  const setRows = (g: number, rows: Row[]) => setGroups((gs) => gs.map((x, i) => (i === g ? { ...x, rows } : x)));

  // Dagen (kolommen): cellen van alle teams schuiven mee
  const mapCells = (fn: (cells: Row['cells']) => Row['cells']) => (groups: Schedule['groups']) =>
    groups.map((g) => ({ ...g, rows: g.rows.map((r) => ({ ...r, cells: fn(r.cells) })) }));
  const addColumn = () => update((s) => ({ ...s, columns: [...s.columns, { day: days[0] }], groups: mapCells((cells) => [...cells, emptyCell()])(s.groups) }));
  const removeColumn = (c: number) => {
    if (!confirm('Deze dag verwijderen? De tijden op deze dag gaan ook weg.')) return;
    update((s) => ({ ...s, columns: s.columns.filter((_, i) => i !== c), groups: mapCells((cells) => cells.filter((_, i) => i !== c))(s.groups) }));
  };
  const moveColumn = (c: number, to: number) => update((s) => ({ ...s, columns: move(s.columns, c, to), groups: mapCells((cells) => move(cells, c, to))(s.groups) }));
  const setColumn = (c: number, column: Column) => update((s) => ({ ...s, columns: s.columns.map((col, i) => (i === c ? column : col)) }));

  // Kolom Veld alleen waar die gebruikt wordt (zaal heeft de locatie al in de dag)
  const showField = tab === 'veld' || s.groups.some((g) => g.rows.some((r) => r.cells.some((c) => c.field)));
  const gridColumns: GridColumn<FlatRow>[] = [
    { ...keyColumn('team', textColumn), title: head('Team', ' '), minWidth: 150 },
    ...s.columns.flatMap((col, i) => {
      const day = col.location ? `${col.day} · ${col.location}` : col.day;
      return [
        { ...keyColumn(`t${i}`, textColumn), title: head(day, 'Tijd'), minWidth: 120 },
        ...(showField ? [{ ...keyColumn(`f${i}`, textColumn), title: head(day, 'Veld'), minWidth: 90 }] : []),
        { ...keyColumn(`n${i}`, textColumn), title: head(day, 'Opmerking'), minWidth: 110 },
      ];
    }),
  ];

  async function onSave() {
    setState({ status: 'saving' });
    const snapshot = JSON.stringify(data);
    // Helemaal lege regels (bijv. net toegevoegd) niet meesturen
    const clean = (s: Schedule): Schedule => ({ ...s, groups: s.groups.map((g) => ({ ...g, rows: g.rows.filter((r) => !isEmpty(r)) })) });
    const content = JSON.stringify({ veld: toFile(clean(data.veld)), zaal: toFile(clean(data.zaal)) });
    const result = await save([{ path, content, sha }]);
    if (result.status === 'saved') {
      setSha(result.data.shas[path]!);
      markSaved(snapshot);
    }
    setState(result);
  }

  return (
    <div className="cms-form training">
      <div className="tabs" role="tablist">
        {(['veld', 'zaal'] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
            {data[key].title}
          </button>
        ))}
      </div>

      <div className="meta">
        <label>
          <span className="control-label">Titel</span>
          <input className="form-control" value={s.title} onChange={(e) => update((s) => ({ ...s, title: e.target.value }))} />
        </label>
        <label>
          <span className="control-label">Start seizoen</span>
          <input className="form-control" value={s.start} placeholder="bijv. 26 augustus 2026" onChange={(e) => update((s) => ({ ...s, start: e.target.value }))} />
        </label>
      </div>

      <fieldset className="days">
        <legend>Dagen</legend>
        <p className="hint">Elke dag wordt een kolom in de tabel. Locatie alleen invullen als er op één dag meerdere locaties zijn.</p>
        <div className="day-list">
          {s.columns.map((col, c) => (
            <div key={c} className="day">
              <select className="form-control" value={col.day} aria-label="Dag" onChange={(e) => setColumn(c, { ...col, day: e.target.value })}>
                {days.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              <input
                className="form-control"
                value={col.location ?? ''}
                placeholder="Locatie"
                aria-label="Locatie"
                onChange={(e) => setColumn(c, { ...col, location: e.target.value || undefined })}
              />
              <div className="tools">
                <button type="button" className="btn" title="Naar links" disabled={c === 0} onClick={() => moveColumn(c, c - 1)}>
                  ←
                </button>
                <button type="button" className="btn" title="Naar rechts" disabled={c === s.columns.length - 1} onClick={() => moveColumn(c, c + 1)}>
                  →
                </button>
                <button type="button" className="btn btn-danger" title="Dag verwijderen" disabled={s.columns.length === 1} onClick={() => removeColumn(c)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn add-day" onClick={addColumn}>
            + Dag
          </button>
        </div>
      </fieldset>

      {s.groups.map((group, g) => (
        <section key={g} className="group">
          <div className="group-head">
            <input
              className="form-control"
              value={group.title}
              aria-label="Groep"
              onChange={(e) => setGroups((gs) => gs.map((x, i) => (i === g ? { ...x, title: e.target.value } : x)))}
            />
            <button type="button" className="btn" title="Groep omhoog" disabled={g === 0} onClick={() => setGroups((gs) => move(gs, g, g - 1))}>
              ↑
            </button>
            <button type="button" className="btn" title="Groep omlaag" disabled={g === s.groups.length - 1} onClick={() => setGroups((gs) => move(gs, g, g + 1))}>
              ↓
            </button>
            <button
              type="button"
              className="btn btn-danger"
              title="Groep verwijderen"
              onClick={() => confirm(`Groep "${group.title}" met alle teams verwijderen?`) && setGroups((gs) => gs.filter((_, i) => i !== g))}
            >
              ✕
            </button>
          </div>
          <DataSheetGrid<FlatRow>
            key={`${tab}-${g}-${s.columns.length}-${showField}`}
            value={toFlat(group.rows)}
            onChange={(rows) => setRows(g, fromFlat(rows, s.columns.length))}
            columns={gridColumns}
            createRow={() => toFlat([{ team: '', cells: s.columns.map(emptyCell) }])[0]}
            duplicateRow={({ rowData }) => ({ ...rowData })}
            headerRowHeight={48}
            rowHeight={36}
            height={Math.min(600, 48 + Math.max(group.rows.length, 1) * 36 + 2)}
            addRowsComponent={AddRows}
            contextMenuComponent={ContextMenu}
            stickyRightColumn={{
              component: ({ rowIndex }) => (
                <div className="row-tools">
                  <button type="button" title="Omhoog" disabled={rowIndex === 0} onClick={() => setRows(g, move(group.rows, rowIndex, rowIndex - 1))}>
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Omlaag"
                    disabled={rowIndex === group.rows.length - 1}
                    onClick={() => setRows(g, move(group.rows, rowIndex, rowIndex + 1))}
                  >
                    ↓
                  </button>
                </div>
              ),
              basis: 64,
            }}
          />
        </section>
      ))}

      <button type="button" className="btn add-group" onClick={() => setGroups((gs) => [...gs, { title: 'Nieuwe groep', rows: [] }])}>
        + Groep
      </button>

      <label className="footnote">
        <span className="control-label">Voetnoot onder de tabel</span>
        <input className="form-control" value={s.note} onChange={(e) => update((s) => ({ ...s, note: e.target.value }))} />
      </label>

      <p className="hint">
        Tijd leeg = geen training. Schrijf tijden als 18:00–19:00. Rechtsklik op een regel om teams in te voegen, te dupliceren of te verwijderen. Plakken uit Excel of
        Google Sheets werkt ook.
      </p>

      <div className="save-bar">
        <button type="button" className="btn btn-info" disabled={state.status === 'saving'} onClick={onSave}>
          Opslaan
        </button>
        <SaveStatus state={state} />
      </div>
    </div>
  );
}
