// Na opslaan of publiceren: volgt de Vercel-deploy van de commit tot de wijziging live staat (of mislukt).
// Concept (draft): niets te volgen, alleen melden dat het nog gepubliceerd moet worden.
import { useEffect, useState } from 'react';

type State = 'pending' | 'ready' | 'error' | 'unknown';

const saved: Record<State, string> = {
  pending: 'Opgeslagen. Bezig met publiceren, dit duurt meestal een minuut…',
  ready: 'Opgeslagen en live op de site.',
  error: 'Opgeslagen, maar publiceren is mislukt. De site toont nog de vorige versie; laat het de beheerder weten.',
  unknown: 'Opgeslagen. De wijziging staat over een paar minuten op de site.',
};

const published: Record<State, string> = {
  pending: 'Bezig met publiceren, dit duurt meestal een minuut…',
  ready: 'Gepubliceerd en live op de site.',
  error: 'Publiceren is mislukt. De site toont nog de vorige versie; laat het de beheerder weten.',
  unknown: 'Gepubliceerd. De wijzigingen staan over een paar minuten op de site.',
};

type Props = { commit: string | null; draft?: boolean; publish?: boolean };

export default function DeployStatus({ commit, draft = false, publish = false }: Props) {
  const [state, setState] = useState<State>(commit ? 'pending' : 'unknown');

  useEffect(() => {
    if (!commit || draft) return;
    let tries = 0;
    const timer = setInterval(async () => {
      // Max 10 minuten volgen
      if (++tries > 60) {
        clearInterval(timer);
        setState('unknown');
        return;
      }
      try {
        const res = await fetch(`/api/beheer/deploy?sha=${commit}`);
        const next: State = res.ok ? (await res.json()).state : 'unknown';
        if (next !== 'pending') clearInterval(timer);
        setState(next);
      } catch {
        // Netwerk even weg: volgende poging
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [commit, draft]);

  if (draft) {
    return (
      <p className="save-status is-ok" role="status">
        Opgeslagen als concept. Zet het live met <a href="/beheer">Publiceren in het overzicht</a>.
      </p>
    );
  }

  return (
    <p className={`save-status ${state === 'error' ? 'is-error' : state === 'pending' ? '' : 'is-ok'}`} role="status">
      {(publish ? published : saved)[state]}
    </p>
  );
}
