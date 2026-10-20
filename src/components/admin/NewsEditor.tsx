// Nieuwsbericht bewerken zoals een pagina in WordPress: titel en tekst op een "pagina" in de opmaak van de site,
// gegevens (publiceren, foto, datum, categorie) in de zijbalk. Tekst wordt als markdown opgeslagen. Opslaan = één commit.
import { useState } from 'react';
import DeployStatus from './DeployStatus';
import RichCanvas, { toWebp, useRichEditor } from './RichCanvas';
import { post, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { useUnsavedWarning } from './unsaved';
import './form.css';
import './news.css';

type Meta = { title: string; titleShort?: string; date: string; category: string; image: string; imageAlt: string; sticky: boolean };

type Props = {
  slug: string | null;
  sha: string | null;
  meta: Meta;
  body: string;
  imageUrl: string | null;
  categories: string[];
  // Gezet na herladen door opslaan: commit om de deploy te volgen ('' = lokaal, 'concept' = nog niet gepubliceerd)
  savedCommit?: string;
};

export default function NewsEditor({ slug, sha: initialSha, meta: initialMeta, body, imageUrl, categories, savedCommit }: Props) {
  const [meta, setMeta] = useState(initialMeta);
  const [sha, setSha] = useState(initialSha);
  const [image, setImage] = useState<{ base64: string; url: string } | null>(null);
  const [bodyChanged, setBodyChanged] = useState(false);
  // Telt wijzigingen in de tekst, voor de waarschuwing bij verlaten
  const [bodyRev, setBodyRev] = useState(0);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const editor = useRichEditor(body, () => {
    setBodyChanged(true);
    setBodyRev((r) => r + 1);
    setState({ status: 'idle' });
  });

  const snapshot = JSON.stringify([meta, image?.url ?? null, bodyRev]);
  const markSaved = useUnsavedWarning(snapshot);

  const set = <K extends keyof Meta>(key: K, value: Meta[K]) => {
    setMeta((m) => ({ ...m, [key]: value }));
    setState({ status: 'idle' });
  };

  async function onImage(file: File | undefined) {
    if (!file) return;
    try {
      setImage(await toWebp(file));
      setState({ status: 'idle' });
    } catch {
      setState({ status: 'error', message: 'Deze foto kan niet worden gelezen. Probeer een JPG of PNG.' });
    }
  }

  async function onSave() {
    if (!editor) return;
    setState({ status: 'saving' });
    const saving = snapshot;
    // Tekst niet aangeraakt: origineel meesturen, zodat opmaak van de markdown gelijk blijft
    const markdown = bodyChanged ? editor.getMarkdown() : body;
    const result = await post<{ slug: string; sha: string; commit: string | null; draft: boolean }>('/api/cms/news', {
      action: 'save',
      slug,
      sha,
      meta: { ...meta, titleShort: meta.titleShort?.trim() || undefined },
      body: markdown,
      image: image?.base64,
    });
    if (result.status === 'saved') {
      markSaved(saving);
      // Nieuw bericht of nieuwe foto: herladen, zodat pad en versie kloppen
      if (!slug || image) {
        location.href = `/cms/nieuws/${result.data.slug}?opgeslagen=${result.data.draft ? 'concept' : (result.data.commit ?? '')}`;
        return;
      }
      setSha(result.data.sha);
    }
    setState(result);
  }

  async function onDelete() {
    if (!slug || !confirm(`"${meta.title}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    setState({ status: 'saving' });
    const result = await post('/api/cms/news', { action: 'delete', slug, sha });
    if (result.status === 'saved') {
      markSaved(snapshot);
      location.href = '/cms/nieuws?verwijderd=1';
    }
    else setState(result);
  }

  const preview = image?.url ?? imageUrl;

  return (
    <div className="cms-form news-editor">
      <header className="topbar">
        <a href="/cms/nieuws" className="back" title="Terug naar nieuws">
          ←
        </a>
        <span className="doc-title">{meta.title || (slug ? 'Bericht bewerken' : 'Nieuw bericht')}</span>
        <button type="button" className="btn btn-info" disabled={state.status === 'saving'} onClick={onSave}>
          {state.status === 'saving' ? 'Bezig…' : slug ? 'Bijwerken' : 'Publiceren'}
        </button>
      </header>

      <div className="layout">
        <RichCanvas editor={editor} title={meta.title} onTitle={(title) => set('title', title)} />

        <aside className="sidebar" aria-label="Berichtgegevens">
          <section className="panel">
            <h2>Publiceren</h2>
            <dl className="facts">
              <dt>Status</dt>
              <dd>{slug ? 'Gepubliceerd' : 'Nog niet geplaatst'}</dd>
            </dl>
            {state.status === 'idle' && savedCommit !== undefined ? <DeployStatus commit={savedCommit || null} draft={savedCommit === 'concept'} /> : <SaveStatus state={state} />}
            {slug && (
              <button type="button" className="link-danger" disabled={state.status === 'saving'} onClick={onDelete}>
                Verwijderen
              </button>
            )}
          </section>

          <section className="panel">
            <h2>Uitgelichte afbeelding</h2>
            <label className="photo">
              {preview ? <img src={preview} alt="" /> : <span className="photo-empty">Afbeelding kiezen</span>}
              <input type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files?.[0])} />
            </label>
            {preview && <p className="help-block">Klik op de afbeelding om een andere te kiezen.</p>}
            <label className="control-label" htmlFor="imageAlt">
              Beschrijving
            </label>
            <textarea id="imageAlt" className="form-control" rows={2} value={meta.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} />
            <p className="help-block">Wat staat er op de foto? Voor mensen die de foto niet kunnen zien.</p>
          </section>

          <section className="panel">
            <h2>Bericht</h2>
            <label className="control-label" htmlFor="date">
              Datum
            </label>
            <input id="date" type="date" className="form-control" value={meta.date} onChange={(e) => set('date', e.target.value)} />

            <label className="control-label" htmlFor="category">
              Categorie
            </label>
            <input id="category" className="form-control" list="categories" value={meta.category} onChange={(e) => set('category', e.target.value)} />
            <datalist id="categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <label className="check">
              <input type="checkbox" checked={meta.sticky} onChange={(e) => set('sticky', e.target.checked)} />
              Vastpinnen bovenaan
            </label>
          </section>

          <section className="panel">
            <h2>Korte titel</h2>
            <input id="titleShort" className="form-control" aria-label="Korte titel" value={meta.titleShort ?? ''} onChange={(e) => set('titleShort', e.target.value)} />
            <p className="help-block">Voor de nieuwslijst op mobiel. Leeg = gewone titel.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
