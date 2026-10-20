// Teams & Sportlink als spreadsheet: één regel per team, per poule een naam- en codekolom.
// Controle tijdens het typen met hetzelfde zod-schema als de server; foute cellen worden rood.
import { useState } from 'react';
import { DataSheetGrid, createAddRowsComponent, createContextMenuComponent, intColumn, keyColumn, textColumn, type Column, type ContextMenuItem } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { club as schema } from '../../data/schemas';
import { save, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { useUnsavedWarning } from './unsaved';
import './form.css';
import './grid.css';

type Pool = { name: string; code: number };
type Team = { short: string; name: string; category: string; teamCode: string; pools: Pool[] };
type Club = { clubCode: string; teams: Team[] };
// Eén regel: teamvelden + per poule j de velden p{j}name en p{j}code
type FlatRow = Record<string, string | number | null>;

const fields: { key: keyof Omit<Team, 'pools'>; label: string; minWidth: number }[] = [
  { key: 'short', label: 'Afkorting', minWidth: 90 },
  { key: 'name', label: 'Naam', minWidth: 200 },
  { key: 'category', label: 'Categorie', minWidth: 110 },
  { key: 'teamCode', label: 'Teamcode', minWidth: 140 },
];

const toFlat = (teams: Team[]): FlatRow[] =>
  teams.map((t) => ({
    short: t.short,
    name: t.name,
    category: t.category,
    teamCode: t.teamCode,
    ...Object.fromEntries(t.pools.flatMap((p, j) => [[`p${j}name`, p.name], [`p${j}code`, p.code]])),
  }));

const text = (v: FlatRow[string]) => (v == null ? '' : String(v).trim());

// Lege regels en lege poules weglaten; code blijft een getal (of 0 als het leeg is, dan meldt de controle het)
const fromFlat = (rows: FlatRow[], poolCols: number): Team[] =>
  rows
    .filter((r) => Object.values(r).some((v) => text(v)))
    .map((r) => ({
      short: text(r.short),
      name: text(r.name),
      category: text(r.category),
      teamCode: text(r.teamCode),
      pools: Array.from({ length: poolCols }, (_, j) => ({ name: text(r[`p${j}name`]), code: r[`p${j}code`] }))
        .filter((p) => p.name || p.code != null)
        .map((p) => ({ name: p.name, code: typeof p.code === 'number' ? p.code : 0 })),
    }));

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

type Props = { path: string; sha: string; data: Club };

export default function ClubEditor({ path, sha: initialSha, data }: Props) {
  const [clubCode, setClubCode] = useState(data.clubCode);
  const [rows, setRows] = useState<FlatRow[]>(toFlat(data.teams));
  const [poolCols, setPoolCols] = useState(Math.max(1, ...data.teams.map((t) => t.pools.length)));
  const [sha, setSha] = useState(initialSha);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const value: Club = { clubCode: clubCode.trim(), teams: fromFlat(rows, poolCols) };
  const markSaved = useUnsavedWarning(JSON.stringify(value));

  // Fouten per cel ("regel:kolom") en als lijst; regels tellen zonder lege regels
  const result = schema.safeParse(value);
  const filled = rows.map((r, i) => [r, i] as const).filter(([r]) => Object.values(r).some((v) => text(v)));
  const issues = result.success
    ? []
    : result.error.issues.map((issue) => {
        const [root, team, field, pool, poolField] = issue.path as (string | number)[];
        if (root !== 'teams' || typeof team !== 'number') {
          return { cell: root === 'clubCode' ? 'clubCode' : '', label: root === 'clubCode' ? 'Clubcode' : '', message: issue.message };
        }
        const row = filled[team]?.[1] ?? team;
        let key = String(field ?? 'short');
        let column = fields.find((f) => f.key === field)?.label ?? '';
        if (field === 'pools' && typeof pool === 'number') {
          // Lege poules tellen niet mee in de data, wel als kolom
          const used = Array.from({ length: poolCols }, (_, j) => j).filter((j) => text(rows[row]?.[`p${j}name`]) || rows[row]?.[`p${j}code`] != null);
          const j = used[pool] ?? pool;
          key = `p${j}${poolField ?? 'name'}`;
          column = `Poule ${j + 1}${poolField === 'code' ? ' code' : ''}`;
        }
        const name = text(rows[row]?.short) || text(rows[row]?.name) || `regel ${row + 1}`;
        return { cell: `${row}:${key}`, label: `${name}${column ? ` › ${column}` : ''}`, message: issue.message };
      });
  const badCells = new Set(issues.map((i) => i.cell));
  const errorClass = (key: string) => ({ rowIndex }: { rowIndex: number }) => (badCells.has(`${rowIndex}:${key}`) ? 'cell-error' : undefined);

  const columns: Column<FlatRow>[] = [
    ...fields.map((f) => ({ ...keyColumn(f.key, textColumn), title: head(f.label, ' '), minWidth: f.minWidth, cellClassName: errorClass(f.key) })),
    ...Array.from({ length: poolCols }, (_, j) => [
      { ...keyColumn(`p${j}name`, textColumn), title: head(`Poule ${j + 1}`, 'Naam'), minWidth: 110, cellClassName: errorClass(`p${j}name`) },
      { ...keyColumn(`p${j}code`, intColumn), title: head(`Poule ${j + 1}`, 'Code'), minWidth: 100, cellClassName: errorClass(`p${j}code`) },
    ]).flat(),
  ];

  const change = (fn: () => void) => {
    fn();
    setState({ status: 'idle' });
  };

  async function onSave() {
    setState({ status: 'saving' });
    const content = JSON.stringify(value);
    const result = await save([{ path, content, sha }]);
    if (result.status === 'saved') {
      setSha(result.data.shas[path]!);
      markSaved(content);
    }
    setState(result);
  }

  return (
    <div className="cms-form training club">
      <label className="club-code">
        <span className="control-label">Clubcode</span>
        <input
          className={`form-control ${badCells.has('clubCode') ? 'is-invalid' : ''}`}
          value={clubCode}
          onChange={(e) => change(() => setClubCode(e.target.value.toUpperCase()))}
        />
        <span className="help-block">Sportlink-clubcode. Alleen wijzigen als je zeker weet wat je doet.</span>
      </label>

      <div className="group-head">
        <h2>Teams</h2>
        <button type="button" className="btn" onClick={() => change(() => setPoolCols((n) => n + 1))}>
          + Poule-kolom
        </button>
      </div>
      <DataSheetGrid<FlatRow>
        key={poolCols}
        value={rows}
        onChange={(next) => change(() => setRows(next))}
        columns={columns}
        createRow={() => ({ short: '', name: '', category: '', teamCode: '' })}
        duplicateRow={({ rowData }) => ({ ...rowData })}
        headerRowHeight={48}
        rowHeight={36}
        height={Math.min(720, 48 + Math.max(rows.length, 1) * 36 + 2)}
        addRowsComponent={AddRows}
        contextMenuComponent={ContextMenu}
        stickyRightColumn={{
          component: ({ rowIndex }) => (
            <div className="row-tools">
              <button type="button" title="Omhoog" disabled={rowIndex === 0} onClick={() => change(() => setRows((r) => move(r, rowIndex, rowIndex - 1)))}>
                ↑
              </button>
              <button type="button" title="Omlaag" disabled={rowIndex === rows.length - 1} onClick={() => change(() => setRows((r) => move(r, rowIndex, rowIndex + 1)))}>
                ↓
              </button>
            </div>
          ),
          basis: 64,
        }}
      />

      <p className="hint">
        Afkorting wordt ook de link van de teampagina (bijv. J5 → /teams/j5/). Teamcode en poulecodes komen uit Sportlink; een verkeerde code betekent dat programma en
        uitslagen van dat team niet kloppen. Lege poules en lege regels worden weggelaten. Rechtsklik voor invoegen, dupliceren en verwijderen; plakken uit Excel werkt
        ook.
      </p>

      {issues.length > 0 && (
        <div className="save-status is-error" role="alert">
          <p>Nog niet goed:</p>
          <ul>
            {issues.map((i, n) => (
              <li key={n}>
                {i.label ? `${i.label}: ` : ''}
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="save-bar">
        <button type="button" className="btn btn-info" disabled={state.status === 'saving' || issues.length > 0} onClick={onSave}>
          Opslaan
        </button>
        <SaveStatus state={state} />
      </div>
    </div>
  );
}
