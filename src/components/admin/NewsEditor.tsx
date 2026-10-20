// Nieuwsbericht bewerken zoals een pagina in WordPress: titel en tekst op een "pagina" in de opmaak van de site,
// gegevens (publiceren, foto, datum, categorie) in de zijbalk. Tekst wordt als markdown opgeslagen. Opslaan = één commit.
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import DeployStatus from './DeployStatus';
import { post, type SaveState } from './save';
import SaveStatus from './SaveStatus';
import { SlashMenu } from './SlashMenu';
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

// Foto in de browser verkleinen naar max 1600px breed, als WebP (scheelt upload en blijft onder de limiet van Vercel)
async function toWebp(file: File): Promise<{ base64: string; url: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/webp', 0.82));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return { base64: btoa(binary), url: URL.createObjectURL(blob) };
}

export default function NewsEditor({ slug, sha: initialSha, meta: initialMeta, body, imageUrl, categories, savedCommit }: Props) {
  const [meta, setMeta] = useState(initialMeta);
  const [sha, setSha] = useState(initialSha);
  const [image, setImage] = useState<{ base64: string; url: string } | null>(null);
  const [bodyChanged, setBodyChanged] = useState(false);
  // Telt wijzigingen in de tekst, voor de waarschuwing bij verlaten
  const [bodyRev, setBodyRev] = useState(0);
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Titelveld groeit mee met de tekst, ook bij het laden
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [meta.title]);

  const editor = useEditor({
    extensions: [
      // Onderstrepen bestaat niet in markdown
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false }, underline: false }),
      // Markdown-tabel: eerste rij is altijd de kop, geen breedtes
      TableKit.configure({ table: { resizable: false } }),
      SlashMenu,
      Placeholder.configure({ placeholder: 'Begin met schrijven, of typ / voor een kop, lijst of tabel…' }),
      Markdown,
    ],
    content: body,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: () => {
      setBodyChanged(true);
      setBodyRev((r) => r + 1);
      setState({ status: 'idle' });
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor?.isActive('heading', { level: 2 }),
      h3: editor?.isActive('heading', { level: 3 }),
      bold: editor?.isActive('bold'),
      italic: editor?.isActive('italic'),
      bullet: editor?.isActive('bulletList'),
      ordered: editor?.isActive('orderedList'),
      quote: editor?.isActive('blockquote'),
      link: editor?.isActive('link'),
      table: editor?.isActive('table'),
    }),
  });

  const snapshot = JSON.stringify([meta, image?.url ?? null, bodyRev]);
  const markSaved = useUnsavedWarning(snapshot);

  const set = <K extends keyof Meta>(key: K, value: Meta[K]) => {
    setMeta((m) => ({ ...m, [key]: value }));
    setState({ status: 'idle' });
  };

  function setLink() {
    if (!editor) return;
    const url = prompt('Link (laat leeg om te verwijderen)', editor.getAttributes('link').href ?? 'https://');
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    (url.trim() ? chain.setLink({ href: url.trim() }) : chain.unsetLink()).run();
  }

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
  const tool = (label: ReactNode, title: string, isActive: boolean | undefined, run: () => void) => (
    <button type="button" title={title} aria-pressed={!!isActive} className={isActive ? 'is-active' : ''} onClick={run}>
      {label}
    </button>
  );

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
        <div className="canvas">
          <div className="toolbar" role="toolbar" aria-label="Opmaak">
            {tool('Kop', 'Kop', active?.h2, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
            {tool('Subkop', 'Subkop', active?.h3, () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
            <span className="sep" />
            {tool(<b>B</b>, 'Vet (Ctrl+B)', active?.bold, () => editor?.chain().focus().toggleBold().run())}
            {tool(<i>I</i>, 'Cursief (Ctrl+I)', active?.italic, () => editor?.chain().focus().toggleItalic().run())}
            {tool('Link', 'Link', active?.link, setLink)}
            <span className="sep" />
            {tool('• Lijst', 'Opsomming', active?.bullet, () => editor?.chain().focus().toggleBulletList().run())}
            {tool('1. Lijst', 'Genummerde lijst', active?.ordered, () => editor?.chain().focus().toggleOrderedList().run())}
            {tool('“ Citaat', 'Citaat', active?.quote, () => editor?.chain().focus().toggleBlockquote().run())}
            {tool('▦ Tabel', 'Tabel invoegen', active?.table, () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
            <span className="sep" />
            {tool('↶', 'Ongedaan maken (Ctrl+Z)', false, () => editor?.chain().focus().undo().run())}
            {tool('↷', 'Opnieuw (Ctrl+Shift+Z)', false, () => editor?.chain().focus().redo().run())}
          </div>

          <div className="page">
            <textarea
              ref={titleRef}
              className="title-input"
              rows={1}
              placeholder="Titel toevoegen"
              aria-label="Titel"
              value={meta.title}
              onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
            />
            <EditorContent editor={editor} className="prose" />
            {editor && (
              <>
                {/* Tekst geselecteerd (buiten een tabel): snelle opmaak */}
                <BubbleMenu
                  editor={editor}
                  pluginKey="textMenu"
                  className="toolbar bubble"
                  shouldShow={({ editor, from, to }) => from !== to && !editor.isActive('table')}
                >
                  {tool(<b>B</b>, 'Vet (Ctrl+B)', active?.bold, () => editor.chain().focus().toggleBold().run())}
                  {tool(<i>I</i>, 'Cursief (Ctrl+I)', active?.italic, () => editor.chain().focus().toggleItalic().run())}
                  {tool('Link', 'Link', active?.link, setLink)}
                  <span className="sep" />
                  {tool('Kop', 'Kop', active?.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                  {tool('Subkop', 'Subkop', active?.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                </BubbleMenu>
                {/* Cursor in een tabel: rijen en kolommen */}
                <BubbleMenu editor={editor} pluginKey="tableMenu" className="toolbar bubble" shouldShow={({ editor }) => editor.isActive('table')}>
                  {tool('+ Rij', 'Rij eronder', false, () => editor.chain().focus().addRowAfter().run())}
                  {tool('+ Kolom', 'Kolom rechts', false, () => editor.chain().focus().addColumnAfter().run())}
                  <span className="sep" />
                  {tool('− Rij', 'Rij verwijderen', false, () => editor.chain().focus().deleteRow().run())}
                  {tool('− Kolom', 'Kolom verwijderen', false, () => editor.chain().focus().deleteColumn().run())}
                  <span className="sep" />
                  {tool('Tabel weg', 'Tabel verwijderen', false, () => editor.chain().focus().deleteTable().run())}
                </BubbleMenu>
              </>
            )}
          </div>
        </div>

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
