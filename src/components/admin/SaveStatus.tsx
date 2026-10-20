import DeployStatus from './DeployStatus';
import type { SaveState } from './save';

export default function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === 'idle') return null;
  if (state.status === 'saving') return <p className="save-status">Bezig met opslaan…</p>;
  if (state.status === 'saved') {
    const { commit, draft } = state.data as { commit?: string | null; draft?: boolean };
    return <DeployStatus key={commit ?? ''} commit={commit ?? null} draft={draft} />;
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
