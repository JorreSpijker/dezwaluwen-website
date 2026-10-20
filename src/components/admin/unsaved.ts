// Waarschuwing van de browser bij verlaten van de pagina met niet-opgeslagen wijzigingen.
// current = de inhoud als tekst; geeft markSaved terug om na opslaan de nieuwe stand vast te leggen.
import { useEffect, useRef } from 'react';

export function useUnsavedWarning(current: string) {
  const saved = useRef(current);
  const latest = useRef(current);
  latest.current = current;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) e.preventDefault();
    };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, []);

  return (value: string) => {
    saved.current = value;
  };
}
