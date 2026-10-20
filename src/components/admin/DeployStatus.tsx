// Na opslaan: volgt de Vercel-deploy van de commit tot de wijziging live staat (of mislukt).
import { useEffect, useState } from 'react';

type State = 'pending' | 'ready' | 'error' | 'unknown';

const messages: Record<State, string> = {
  pending: 'Opgeslagen. Bezig met publiceren, dit duurt meestal een minuut…',
  ready: 'Opgeslagen en live op de site.',
  error: 'Opgeslagen, maar publiceren is mislukt. De site toont nog de vorige versie; laat het de beheerder weten.',
  unknown: 'Opgeslagen. De wijziging staat over een paar minuten op de site.',
};

export default function DeployStatus({ commit }: { commit: string | null }) {
  const [state, setState] = useState<State>(commit ? 'pending' : 'unknown');

  useEffect(() => {
    if (!commit) return;
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
  }, [commit]);

  return (
    <p className={`save-status ${state === 'error' ? 'is-error' : state === 'pending' ? '' : 'is-ok'}`} role="status">
      {messages[state]}
    </p>
  );
}
