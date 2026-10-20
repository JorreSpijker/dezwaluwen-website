// Pagina bewerken, zelfde opbouw als nieuws: titel, intro en tekst op de "pagina",
// gegevens (publiceren, foto, kruimelpad, feiten) in de zijbalk. Opslaan = één commit.
import { useState } from 'react';
import DeployStatus from './DeployStatus';
import RichCanvas, { AutoGrow, toWebp, useRichEditor } from './RichCanvas';
import { post, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { useUnsavedWarning } from './unsaved';
import './form.css';
import './news.css';

type Fact = { title: string; text: string };
type Meta = {
  title: string;
  description: string;
  section: string;
  lead: string;
  image: string;
  imageAlt: string;
  factsStyle: 'tekst' | 'cijfers';
  facts: Fact[];
  block: string;
};

type Props = {
  slug: string | null;
  sha: string | null;
  meta: Meta;
  body: string;
  imageUrl: string | null;
  blocks: Record<string, string>;
  // Gezet na herladen door opslaan: commit om de deploy te volgen ('' = lokaal, 'concept' = nog niet gepubliceerd)
  savedCommit?: string;
};

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const move = <T,>(list: T[], from: number, to: number) => {
  const copy = [...list];
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
};

export default function PageEditor({ slug, sha: initialSha, meta: initialMeta, body, imageUrl, blocks, savedCommit }: Props) {
  const [meta, setMeta] = useState(initialMeta);
  const [sha, setSha] = useState(initialSha);
  // Adres van een nieuwe pagina: volgt de titel tot je het zelf aanpast
  const [newSlug, setNewSlug] = useState<string | null>(null);
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
  const address = slug ?? newSlug ?? slugify(meta.title);

  const set = <K extends keyof Meta>(key: K, value: Meta[K]) => {
    setMeta((m) => ({ ...m, [key]: value }));
    setState({ status: 'idle' });
  };
  const setFact = (i: number, fact: Fact) => set('facts', meta.facts.map((f, j) => (j === i ? fact : f)));

  async function onImage(file: File | undefined) {
    if (!file) return;
    try {
      setImage(await toWebp(file));
      setState({ status: 'idle' });
    } catch {
      setState({ status: 'error', message: 'Deze foto kan niet worden gelezen. Probeer een JPG of PNG.' });
    }
  }

  function removeImage() {
    setImage(null);
    set('image', '');
  }

  async function onSave() {
    if (!editor) return;
    setState({ status: 'saving' });
    const saving = snapshot;
    // Tekst niet aangeraakt: origineel meesturen, zodat opmaak van de markdown gelijk blijft
    const markdown = bodyChanged ? editor.getMarkdown() : body;
    const result = await post<{ slug: string; sha: string; commit: string | null; draft: boolean }>('/api/cms/pages', {
      action: 'save',
      slug,
      newSlug: slug ? undefined : address,
      sha,
      meta: { ...meta, imageAlt: meta.image || image ? meta.imageAlt : '' },
      body: markdown,
      image: image?.base64,
    });
    if (result.status === 'saved') {
      markSaved(saving);
      // Nieuwe pagina of foto gewijzigd: herladen, zodat pad en versie kloppen
      if (!slug || image || meta.image !== initialMeta.image) {
        location.href = `/cms/paginas/${result.data.slug}?opgeslagen=${result.data.draft ? 'concept' : (result.data.commit ?? '')}`;
        return;
      }
      setSha(result.data.sha);
    }
    setState(result);
  }

  async function onDelete() {
    if (!slug || !confirm(`"${meta.title}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return;
    setState({ status: 'saving' });
    const result = await post('/api/cms/pages', { action: 'delete', slug, sha });
    if (result.status === 'saved') {
      markSaved(snapshot);
      location.href = '/cms/paginas?verwijderd=1';
    } else setState(result);
  }

  const preview = image?.url ?? (meta.image ? imageUrl : null);

  return (
    <div className="cms-form news-editor page-editor">
      <header className="topbar">
        <a href="/cms/paginas" className="back" title="Terug naar pagina's">
          ←
        </a>
        <span className="doc-title">{meta.title || (slug ? 'Pagina bewerken' : 'Nieuwe pagina')}</span>
        <button type="button" className="btn btn-info" disabled={state.status === 'saving'} onClick={onSave}>
          {state.status === 'saving' ? 'Bezig…' : slug ? 'Bijwerken' : 'Publiceren'}
        </button>
      </header>

      <div className="layout">
        <RichCanvas editor={editor} title={meta.title} onTitle={(title) => set('title', title)}>
          <AutoGrow className="lead-input" placeholder="Intro: één of twee zinnen bovenaan de pagina" aria-label="Intro" value={meta.lead} onChange={(lead) => set('lead', lead)} />
        </RichCanvas>

        <aside className="sidebar" aria-label="Paginagegevens">
          <section className="panel">
            <h2>Publiceren</h2>
            <dl className="facts">
              <dt>Status</dt>
              <dd>{slug ? 'Gepubliceerd' : 'Nog niet geplaatst'}</dd>
              <dt>Adres</dt>
              <dd>{slug ? <a href={`/${slug}/`} target="_blank" rel="noopener">/{slug}/</a> : `/${address}/`}</dd>
            </dl>
            {!slug && (
              <>
                <label className="control-label" htmlFor="slug">
                  Adres aanpassen
                </label>
                <input id="slug" className="form-control" value={address} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} />
                <p className="help-block">Kan na plaatsen niet meer veranderen.</p>
              </>
            )}
            {state.status === 'idle' && savedCommit !== undefined ? <DeployStatus commit={savedCommit || null} draft={savedCommit === 'concept'} /> : <SaveStatus state={state} />}
            {slug && (
              <button type="button" className="link-danger" disabled={state.status === 'saving'} onClick={onDelete}>
                Verwijderen
              </button>
            )}
          </section>

          <section className="panel">
            <h2>Afbeelding</h2>
            <label className="photo">
              {preview ? <img src={preview} alt="" /> : <span className="photo-empty">Afbeelding kiezen (optioneel)</span>}
              <input type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files?.[0])} />
            </label>
            {preview && (
              <>
                <p className="help-block">Klik op de afbeelding om een andere te kiezen.</p>
                <button type="button" className="link-danger" onClick={removeImage}>
                  Afbeelding weghalen
                </button>
                <label className="control-label" htmlFor="imageAlt">
                  Beschrijving
                </label>
                <textarea id="imageAlt" className="form-control" rows={2} value={meta.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} />
                <p className="help-block">Wat staat er op de foto? Voor mensen die de foto niet kunnen zien.</p>
              </>
            )}
          </section>

          <section className="panel">
            <h2>Pagina</h2>
            <label className="control-label" htmlFor="section">
              Kruimelpad
            </label>
            <input id="section" className="form-control" value={meta.section} onChange={(e) => set('section', e.target.value)} />
            <p className="help-block">Menugroep boven de titel, bijv. "Nieuw lid?". Leeg = alleen Home.</p>

            <label className="control-label" htmlFor="description">
              Beschrijving voor Google
            </label>
            <textarea id="description" className="form-control" rows={3} value={meta.description} onChange={(e) => set('description', e.target.value)} />
            <p className="help-block">Eén of twee zinnen; staat in zoekresultaten en bij delen.</p>

            <label className="control-label" htmlFor="block">
              Vast blok na de eerste alinea
            </label>
            <select id="block" className="form-control" value={meta.block} onChange={(e) => set('block', e.target.value)}>
              <option value="">Geen</option>
              {Object.entries(blocks).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </section>

          <section className="panel">
            <h2>Feiten</h2>
            <p className="help-block">Blokjes onder de foto. Leeg = geen feiten.</p>
            <label className="control-label" htmlFor="factsStyle">
              Weergave
            </label>
            <select id="factsStyle" className="form-control" value={meta.factsStyle} onChange={(e) => set('factsStyle', e.target.value as Meta['factsStyle'])}>
              <option value="tekst">Titel met tekst</option>
              <option value="cijfers">Groot cijfer met tekst</option>
            </select>
            {meta.factsStyle === 'cijfers' && <p className="help-block">{'{teams}'} in het cijfer = aantal teams, automatisch.</p>}
            {meta.facts.map((f, i) => (
              <div className="fact-item" key={i}>
                <input className="form-control" aria-label={meta.factsStyle === 'cijfers' ? 'Cijfer' : 'Titel'} placeholder={meta.factsStyle === 'cijfers' ? 'Cijfer' : 'Titel'} value={f.title} onChange={(e) => setFact(i, { ...f, title: e.target.value })} />
                <textarea className="form-control" rows={2} aria-label="Tekst" placeholder="Tekst" value={f.text} onChange={(e) => setFact(i, { ...f, text: e.target.value })} />
                <span className="fact-tools">
                  <button type="button" className="btn" title="Omhoog" disabled={i === 0} onClick={() => set('facts', move(meta.facts, i, i - 1))}>
                    ↑
                  </button>
                  <button type="button" className="btn" title="Omlaag" disabled={i === meta.facts.length - 1} onClick={() => set('facts', move(meta.facts, i, i + 1))}>
                    ↓
                  </button>
                  <button type="button" className="btn btn-danger" title="Feit verwijderen" onClick={() => set('facts', meta.facts.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => set('facts', [...meta.facts, { title: '', text: '' }])}>
              + Feit
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
