// Overzicht van ongepubliceerde wijzigingen met één knop om alles live te zetten.
import { useState } from 'react';
import DeployStatus from './DeployStatus';
import { post, type SaveState } from './save';
import './form.css';
import './publish.css';

type Props = { items: { label: string; status: string }[]; authors: string[]; previewUrl: string | null };

export default function PublishPanel({ items, authors, previewUrl }: Props) {
  const [state, setState] = useState<SaveState<{ commit: string | null }>>({ status: 'idle' });

  async function onPublish() {
    if (!confirm(`${items.length} ${items.length === 1 ? 'wijziging' : 'wijzigingen'} live zetten?`)) return;
    setState({ status: 'saving' });
    setState(await post<{ commit: string | null }>('/api/cms/publish', {}));
  }

  if (state.status === 'saved') {
    return (
      <section className="cms-form publish">
        {state.data.commit ? <DeployStatus commit={state.data.commit} publish /> : <p className="save-status is-ok">Alles is al gepubliceerd.</p>}
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="cms-form publish is-empty">
        <p>Alles is gepubliceerd.</p>
      </section>
    );
  }

  return (
    <section className="cms-form publish">
      <h2>
        {items.length} {items.length === 1 ? 'wijziging' : 'wijzigingen'} nog niet gepubliceerd
      </h2>
      <ul>
        {items.map((i, n) => (
          <li key={n}>
            {i.label} <span className="publish-status">{i.status}</span>
          </li>
        ))}
      </ul>
      {authors.length > 0 && <p className="publish-meta">Door {authors.join(', ')}</p>}
      <div className="publish-actions">
        <button type="button" className="btn btn-info" disabled={state.status === 'saving'} onClick={onPublish}>
          {state.status === 'saving' ? 'Bezig…' : 'Publiceren'}
        </button>
        {previewUrl ? (
          <a href={previewUrl} target="_blank" rel="noopener">
            Bekijk preview
          </a>
        ) : (
          <span className="publish-meta">Preview wordt nog gebouwd…</span>
        )}
      </div>
      {(state.status === 'error' || state.status === 'invalid') && (
        <p className="save-status is-error" role="alert">
          {state.status === 'error' ? state.message : 'Publiceren mislukt.'}
        </p>
      )}
    </section>
  );
}
