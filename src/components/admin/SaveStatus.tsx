import type { SaveState } from './save';

export default function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === 'idle') return null;
  if (state.status === 'saving') return <p className="save-status">Bezig met opslaan…</p>;
  if (state.status === 'saved') {
    return <p className="save-status is-ok">Opgeslagen. De wijziging staat over ongeveer een minuut op de site.</p>;
  }
  if (state.status === 'invalid') {
    return (
      <div className="save-status is-error" role="alert">
        <p>Niet opgeslagen, controleer:</p>
        <ul>
          {state.issues.map((i, n) => (
            <li key={n}>
              {i.path.length ? `${i.path.join(' › ')}: ` : ''}
              {i.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <p className="save-status is-error" role="alert">
      {state.message}
    </p>
  );
}
