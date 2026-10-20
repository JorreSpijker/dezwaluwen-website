// "/" in de tekst: lijst met blokken om in te voegen (kop, lijst, citaat, tabel). Pijltjes + Enter of klikken.
import { Extension, ReactRenderer, type Editor, type Range } from '@tiptap/react';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

type Item = { title: string; run: (editor: Editor, range: Range) => void };

const block = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

const items: Item[] = [
  { title: 'Kop', run: (e, r) => block(e, r).setNode('heading', { level: 2 }).run() },
  { title: 'Subkop', run: (e, r) => block(e, r).setNode('heading', { level: 3 }).run() },
  { title: 'Opsomming', run: (e, r) => block(e, r).toggleBulletList().run() },
  { title: 'Genummerde lijst', run: (e, r) => block(e, r).toggleOrderedList().run() },
  { title: 'Citaat', run: (e, r) => block(e, r).toggleBlockquote().run() },
  { title: 'Tabel', run: (e, r) => block(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

type ListRef = { onKeyDown: (event: KeyboardEvent) => boolean };

const List = forwardRef<ListRef, SuggestionProps<Item>>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;
      if (event.key === 'ArrowDown') setSelected((s) => (s + 1) % items.length);
      else if (event.key === 'ArrowUp') setSelected((s) => (s + items.length - 1) % items.length);
      else if (event.key === 'Enter') command(items[selected]);
      else return false;
      return true;
    },
  }));

  if (!items.length) return null;
  return (
    <div className="slash-menu" role="listbox" aria-label="Blok invoegen">
      {items.map((item, i) => (
        <button type="button" key={item.title} role="option" aria-selected={i === selected} className={i === selected ? 'is-active' : ''} onClick={() => command(item)}>
          {item.title}
        </button>
      ))}
    </div>
  );
});

export const SlashMenu = Extension.create({
  name: 'slashMenu',
  addProseMirrorPlugins() {
    return [
      Suggestion<Item>({
        editor: this.editor,
        char: '/',
        items: ({ query }) => items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<ListRef, SuggestionProps<Item>>;
          // Vast onder de cursor, buiten de editor zodat niets het afknipt
          const place = (props: SuggestionProps<Item>) => {
            const rect = props.clientRect?.();
            if (rect) Object.assign(renderer.element.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.bottom + 6}px`, zIndex: '50' });
          };
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(List, { props, editor: props.editor });
              document.body.appendChild(renderer.element);
              place(props);
            },
            onUpdate: (props) => {
              renderer.updateProps(props);
              place(props);
            },
            onKeyDown: ({ event }) => (event.key === 'Escape' ? false : (renderer.ref?.onKeyDown(event) ?? false)),
            onExit: () => {
              renderer.element.remove();
              renderer.destroy();
            },
          };
        },
      }),
    ];
  },
});
