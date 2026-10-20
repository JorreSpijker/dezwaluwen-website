// Gedeeld door nieuws en pagina's: werkbalk + "pagina" met titel en tekst in de opmaak van de site.
// Tekst in TipTap, opgeslagen als markdown. children komt tussen titel en tekst (bijv. de intro van een pagina).
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { SlashMenu } from './SlashMenu';

export function useRichEditor(body: string, onUpdate: () => void) {
  return useEditor({
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
    onUpdate,
  });
}

// Tekstvak dat meegroeit met de inhoud, ook bij het laden
export function AutoGrow({ value, onChange, ...props }: { value: string; onChange: (v: string) => void; className: string; placeholder: string; 'aria-label': string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))} {...props} />;
}

type Props = { editor: Editor | null; title: string; onTitle: (title: string) => void; children?: ReactNode };

export default function RichCanvas({ editor, title, onTitle, children }: Props) {
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

  function setLink() {
    if (!editor) return;
    const url = prompt('Link (laat leeg om te verwijderen)', editor.getAttributes('link').href ?? 'https://');
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    (url.trim() ? chain.setLink({ href: url.trim() }) : chain.unsetLink()).run();
  }

  const tool = (label: ReactNode, title: string, isActive: boolean | undefined, run: () => void) => (
    <button type="button" title={title} aria-pressed={!!isActive} className={isActive ? 'is-active' : ''} onClick={run}>
      {label}
    </button>
  );

  return (
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
        <AutoGrow className="title-input" placeholder="Titel toevoegen" aria-label="Titel" value={title} onChange={onTitle} />
        {children}
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
  );
}

// Foto in de browser verkleinen naar max 1600px breed, als WebP (scheelt upload en blijft onder de limiet van Vercel)
export async function toWebp(file: File): Promise<{ base64: string; url: string }> {
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
