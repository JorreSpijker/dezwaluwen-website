// Bestuur & commissies als repeater: elke commissie een inklapbare kaart, taken en leden als regels.
// Controle tijdens het typen met hetzelfde zod-schema als de server; foute velden worden rood.
import { useState, type ReactNode } from 'react';
import { organisatie as schema } from '../../data/schemas';
import { save, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { useUnsavedWarning } from './unsaved';
import './form.css';
import './organisatie.css';

type Member = { name: string; role: string; email?: string };
type Group = { id: string; name: string; short?: string; email: string; description: string; tasksTitle?: string; tasks: string[]; members: Member[] };
type Organisatie = { bestuur: Group; commissies: Group[] };
// Vaste key per commissie zodat open/dicht meeverhuist bij verplaatsen
type Row = Group & { key: number };

const move = <T,>(list: T[], from: number, to: number) => {
  const copy = [...list];
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
};

const fieldLabels: Record<string, string> = {
  id: 'ID',
  name: 'Naam',
  short: 'Afkorting',
  email: 'E-mail',
  description: 'Omschrijving',
  tasksTitle: 'Titel boven de taken',
  tasks: 'Taken',
  members: 'Leden',
  role: 'Rol',
};

type Props = { path: string; sha: string; data: Organisatie };

export default function OrganisatieEditor({ path, sha: initialSha, data }: Props) {
  const [bestuur, setBestuur] = useState(data.bestuur);
  const [rows, setRows] = useState<Row[]>(data.commissies.map((c, key) => ({ ...c, key })));
  const [nextKey, setNextKey] = useState(data.commissies.length);
  const [open, setOpen] = useState<Set<number | 'bestuur'>>(new Set());
  const [sha, setSha] = useState(initialSha);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const value: Organisatie = { bestuur, commissies: rows.map(({ key, ...c }) => c) };
  const markSaved = useUnsavedWarning(JSON.stringify(value));

  const result = schema.safeParse(value);
  const issues = result.success ? [] : result.error.issues.map((i) => ({ path: i.path.map(String), message: i.message }));
  const bad = new Set(issues.map((i) => i.path.join('.')));
  const hasIssue = (prefix: string) => issues.some((i) => i.path.join('.').startsWith(`${prefix}.`));
  const issueLabel = (p: string[]) => {
    const [root, a, b, c, d] = p;
    const group = root === 'bestuur' ? bestuur : rows[Number(a)];
    const rest = root === 'bestuur' ? [a, b, c] : [b, c, d];
    const parts = [group?.name || (root === 'bestuur' ? 'Bestuur' : `Commissie ${Number(a) + 1}`)];
    if (rest[0]) parts.push(fieldLabels[rest[0]] ?? rest[0]);
    if (rest[1]) parts.push(`regel ${Number(rest[1]) + 1}`);
    if (rest[2]) parts.push(fieldLabels[rest[2]] ?? rest[2]);
    return parts.join(' › ');
  };

  const change = (fn: () => void) => {
    fn();
    setState({ status: 'idle' });
  };
  const toggle = (k: number | 'bestuur', isOpen: boolean) =>
    setOpen((s) => {
      const next = new Set(s);
      if (isOpen) next.add(k);
      else next.delete(k);
      return next;
    });
  const setRow = (i: number, group: Group) => change(() => setRows((r) => r.map((row, j) => (j === i ? { ...group, key: row.key } : row))));

  function addCommissie() {
    change(() => {
      setRows((r) => [...r, { key: nextKey, id: '', name: '', email: '', description: '', tasks: [], members: [] }]);
      toggle(nextKey, true);
      setNextKey((k) => k + 1);
    });
  }

  function removeCommissie(i: number) {
    if (!confirm(`${rows[i].name || 'Deze commissie'} verwijderen?`)) return;
    change(() => setRows((r) => r.filter((_, j) => j !== i)));
  }

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
    <div className="cms-form org">
      <h2>Bestuur</h2>
      <Card
        title={bestuur.name}
        sub={`${bestuur.members.length} leden`}
        open={open.has('bestuur')}
        onToggle={(o) => toggle('bestuur', o)}
        invalid={hasIssue('bestuur')}
      >
        <GroupFields group={bestuur} prefix="bestuur" bad={bad} isBestuur onChange={(g) => change(() => setBestuur(g))} />
      </Card>

      <h2>Commissies</h2>
      {rows.map((c, i) => (
        <Card
          key={c.key}
          title={c.name || 'Nieuwe commissie'}
          short={c.short}
          sub={`${c.members.length} ${c.members.length === 1 ? 'lid' : 'leden'}`}
          open={open.has(c.key)}
          onToggle={(o) => toggle(c.key, o)}
          invalid={hasIssue(`commissies.${i}`)}
          tools={
            <Tools
              first={i === 0}
              last={i === rows.length - 1}
              onMove={(d) => change(() => setRows((r) => move(r, i, i + d)))}
              onRemove={() => removeCommissie(i)}
              label="commissie"
            />
          }
        >
          <GroupFields group={c} prefix={`commissies.${i}`} bad={bad} onChange={(g) => setRow(i, g)} />
        </Card>
      ))}
      <button type="button" className="btn btn-add" onClick={addCommissie}>
        + Commissie
      </button>

      {issues.length > 0 && (
        <div className="save-status is-error" role="alert">
          <p>Nog niet goed:</p>
          <ul>
            {issues.map((i, n) => (
              <li key={n}>
                {issueLabel(i.path)}: {i.message}
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

type CardProps = { title: string; short?: string; sub: string; open: boolean; onToggle: (open: boolean) => void; invalid: boolean; tools?: ReactNode; children: ReactNode };

function Card({ title, short, sub, open, onToggle, invalid, tools, children }: CardProps) {
  return (
    <details className={`org-card ${invalid ? 'is-invalid' : ''}`} open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>
        <span className="org-card-title">{title}</span>
        {short && <span className="org-card-short">{short}</span>}
        <span className="org-card-sub">{sub}</span>
        {invalid && <span className="org-card-error">Controleer</span>}
        {tools && (
          // Klikken op de knoppen klapt de kaart niet open of dicht
          <span className="org-card-tools" onClick={(e) => e.preventDefault()}>
            {tools}
          </span>
        )}
      </summary>
      <div className="org-card-body">{children}</div>
    </details>
  );
}

type ToolsProps = { first: boolean; last: boolean; onMove: (delta: number) => void; onRemove: () => void; label: string };

function Tools({ first, last, onMove, onRemove, label }: ToolsProps) {
  return (
    <span className="org-tools">
      <button type="button" className="btn" title="Omhoog" disabled={first} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" className="btn" title="Omlaag" disabled={last} onClick={() => onMove(1)}>
        ↓
      </button>
      <button type="button" className="btn btn-danger" title={`${label[0].toUpperCase()}${label.slice(1)} verwijderen`} onClick={onRemove}>
        ✕
      </button>
    </span>
  );
}

type FieldProps = { label: string; value: string | undefined; onChange: (v: string) => void; invalid: boolean; textarea?: boolean; help?: string; className?: string };

function Field({ label, value, onChange, invalid, textarea, help, className }: FieldProps) {
  const props = { className: `form-control ${invalid ? 'is-invalid' : ''}`, value: value ?? '', onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return (
    <label className={className}>
      <span className="control-label">{label}</span>
      {textarea ? <textarea {...props} /> : <input {...props} />}
      {help && <span className="help-block">{help}</span>}
    </label>
  );
}

type GroupProps = { group: Group; prefix: string; bad: Set<string>; isBestuur?: boolean; onChange: (g: Group) => void };

function GroupFields({ group, prefix, bad, isBestuur, onChange }: GroupProps) {
  const set = <K extends keyof Group>(k: K, v: Group[K]) => onChange({ ...group, [k]: v });
  const is = (...p: (string | number)[]) => bad.has([prefix, ...p].join('.'));
  const setMember = (i: number, m: Member) => set('members', group.members.map((x, j) => (j === i ? m : x)));

  return (
    <>
      <div className="org-fields">
        <Field label="Naam" value={group.name} onChange={(v) => set('name', v)} invalid={is('name')} className="span-2" />
        {!isBestuur && <Field label="Afkorting" value={group.short} onChange={(v) => set('short', v)} invalid={is('short')} />}
        {!isBestuur && (
          <Field
            label="ID"
            value={group.id}
            onChange={(v) => set('id', v)}
            invalid={is('id')}
            help="Kleine letters, cijfers en -. Gebruikt in de link."
          />
        )}
        <Field label="E-mail" value={group.email} onChange={(v) => set('email', v)} invalid={is('email')} className="span-2" />
        <Field label="Omschrijving" value={group.description} onChange={(v) => set('description', v)} invalid={is('description')} textarea className="span-all" />
        {isBestuur && <Field label="Titel boven de taken" value={group.tasksTitle} onChange={(v) => set('tasksTitle', v)} invalid={is('tasksTitle')} className="span-all" />}
      </div>

      <h3>Taken</h3>
      {group.tasks.map((t, i) => (
        <div className="org-line org-task" key={i}>
          <input
            className={`form-control ${is('tasks', i) ? 'is-invalid' : ''}`}
            value={t}
            aria-label={`Taak ${i + 1}`}
            onChange={(e) => set('tasks', group.tasks.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <Tools
            first={i === 0}
            last={i === group.tasks.length - 1}
            onMove={(d) => set('tasks', move(group.tasks, i, i + d))}
            onRemove={() => set('tasks', group.tasks.filter((_, j) => j !== i))}
            label="taak"
          />
        </div>
      ))}
      <button type="button" className="btn btn-add" onClick={() => set('tasks', [...group.tasks, ''])}>
        + Taak
      </button>

      <h3>{isBestuur ? 'Bestuursleden' : 'Leden'}</h3>
      {group.members.length > 0 && (
        <div className="org-line org-member org-member-head" aria-hidden>
          <span>Naam</span>
          <span>Rol</span>
          <span>E-mail{isBestuur ? '' : ' (optioneel)'}</span>
        </div>
      )}
      {group.members.map((m, i) => (
        <div className="org-line org-member" key={i}>
          <input className={`form-control ${is('members', i, 'name') ? 'is-invalid' : ''}`} value={m.name} aria-label="Naam" onChange={(e) => setMember(i, { ...m, name: e.target.value })} />
          <input className={`form-control ${is('members', i, 'role') ? 'is-invalid' : ''}`} value={m.role} aria-label="Rol" onChange={(e) => setMember(i, { ...m, role: e.target.value })} />
          <input
            className={`form-control ${is('members', i, 'email') ? 'is-invalid' : ''}`}
            value={m.email ?? ''}
            aria-label="E-mail"
            onChange={(e) => setMember(i, { ...m, email: e.target.value })}
          />
          <Tools
            first={i === 0}
            last={i === group.members.length - 1}
            onMove={(d) => set('members', move(group.members, i, i + d))}
            onRemove={() => set('members', group.members.filter((_, j) => j !== i))}
            label="lid"
          />
        </div>
      ))}
      <button type="button" className="btn btn-add" onClick={() => set('members', [...group.members, { name: '', role: '', email: '' }])}>
        + {isBestuur ? 'Bestuurslid' : 'Lid'}
      </button>
    </>
  );
}
