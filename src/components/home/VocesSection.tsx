import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { SupporterMessage } from '@/types';

/**
 * Port de `<section id="voces">` — strip de testimonios.
 *
 * **Antes**: era un mockup con 6 nombres + quotes ficticios (Florencia M.,
 * Juan K · Rosario, etc.). Santi lo pidió fuera: "no hay nada, es todo
 * mockup. Lo sacamos hasta que haya algo o llenalo con algunos comentarios
 * de cafecito".
 *
 * **Ahora**: nos enganchamos a `/api/messages` (el mismo feed que muestra
 * `MuroSection`) y pickeamos los que tienen mensaje + están aprobados.
 * Si no hay nada real, el componente no renderiza nada — evitamos mostrar
 * un bloque vacío con "próximamente" más (ya tenemos varios de esos).
 *
 * Cuando el muro tenga comentarios lindos de cafecito, acá arriba se ven
 * en formato strip horizontal — al scroll. Así VocesSection funciona como
 * un "trailer" de lo que hay en el muro más abajo.
 */

/** Cuántos mensajes mostramos en el strip. Los más recientes primero. */
const VOCES_LIMIT = 6;

/** Mínimo de chars para que un mensaje entre al strip — evita los que
 * dicen sólo "gracias!" o un emoji. El muro sigue mostrándolos todos,
 * acá arriba queremos algo que se lea bonito. */
const MIN_MESSAGE_LEN = 20;

function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export default function VocesSection() {
  const [voces, setVoces] = useState<SupporterMessage[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .getApprovedMessages()
      .then((rows) => {
        if (!mounted) return;
        const curated = rows
          .filter((m) => m.message && m.message.trim().length >= MIN_MESSAGE_LEN)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, VOCES_LIMIT);
        setVoces(curated);
      })
      .catch((e) => console.error('[VocesSection] getApprovedMessages failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  // Si no hay comentarios reales todavía, no renderizamos la sección. Es
  // mejor un gap que un bloque "próximamente" — ya tenemos varios así y
  // Santi pidió limpiar mockups.
  if (voces.length === 0) return null;

  return (
    // VocesSection consume el padding estándar de `section { padding: var(--pad-section) 0 }`.
    // Antes tenía `paddingTop: 60` inline — quedaba fuera del ritmo global.
    <section id="voces">
      <div className="wrap">
        <div className="sec-head reveal">
          <div>
            <div className="idx">
              <span className="badge" style={{ background: 'var(--gold)', color: '#0a0908' }}>
                03b · VOCES
              </span>
            </div>
            <h2>los que<br /><em>ya están</em>.</h2>
          </div>
          <p>
            Lo que dejan los que ya aportaron un cafecito. Los leo todos — los
            más lindos suben acá arriba.
          </p>
        </div>

        <div className="testi-strip">
          {voces.map((m, i) => {
            const name = m.isAnonymous ? 'Anónimo' : m.supporterName || 'Amigo/a';
            const amount = formatAmount(m.amount);
            return (
              <div key={m.id} className="testi">
                <div className="viz" style={{ animationDelay: `${-i * 2}s` }} />
                {amount && <div className="tm-dur">{amount}</div>}
                <div className="meta">
                  <div className="n">{name}</div>
                  <div className="q">"{m.message.trim()}"</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
