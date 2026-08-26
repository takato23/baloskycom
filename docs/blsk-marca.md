# BLSK. — marca de la productora (v1.0 candidata)

Fuente: `BLSK_Brand_System_v1.0_candidata` + `BLSK_Manual_de_Marca_v1.0c`.
Assets vivos en `public/brand/blsk/`. Tokens en `src/styles/blsk.css`.

## Arquitectura de marca (regla dura)
- **BALOSKY** = creador / director / voz pública → sitio personal, home, redes propias.
- **BLSK.** = productora / sistema / equipo → `/productora`, propuestas, créditos, TV.
- Firma: "Una producción de BLSK." / "Dirección: Balosky".

Consecuencia para el sitio: **el rebrand BLSK. se aplica a `/productora`, no al resto.**

## Concepto
"Las letras construyen precisión. El punto introduce la señal."
Dos acciones: **01 REDUCIR** (sacar lo decorativo) · **02 SEÑALAR** (un solo gesto por pieza).

## Paleta
| token | hex | rol |
|---|---|---|
| black | `#0A0A0A` | estructura / texto |
| ivory | `#F3F0E8` | fondo / espacio |
| signal | `#FF3B1F` | activación |
| grey | `#6D6D6D` | secundario sobre marfil |
| grey_dark | `#8F8F8F` | secundario sobre negro (AA) |
| light_grey | `#C8C5BE` | divisores sobre marfil |

Proporción: 70–85 % base/imagen · 10–25 % marfil · 5–10 % señal.
**Precedencia:** si el logo señal está en pantalla, ese punto ES la señal — nada más puede ser rojo.
Rojo sobre marfil es 3,1:1 → solo gráfico o texto grande, nunca cuerpo.

## Tipografía
- **Inter Tight (Display)** — títulos, nunca < 20 px, tracking −1 a −2 %.
- **Inter** — cuerpo, mínimo 15–16 px, números tabulares en documentos.
- **IBM Plex Mono** — datos, créditos, numeración, microcopy. Caja alta, tracking +8 %.
  (Reemplaza a JetBrains Mono en el ámbito BLSK.)

## Logo
Cuatro versiones oficiales: maestra mono · señal · micro (< 40 px) · B. técnica (solo favicon).
- Mínimos: 24 px primaria · 16 px micro/mono · 6 mm print mono · 8 mm print señal.
- Área de seguridad: X = diámetro del punto; mínimo **1,5 X**, avatar/cierre **2 X**.
- Sobre foto o fondo complejo → maestra mono.
- Prohibido: unir S y K, alterar el punto, dos señales rojas, degradados/glitch, reconstruir con texto.

## Motion (una sola gramática)
La señal aparece → se asienta → **un corte de 2 frames** activa las letras → hold.
- Easing: `cubic-bezier(0.30, 0, 0.05, 1)`. Sin rebote, sin glitch, sin morph, sin 3D.
- Las letras nunca se desplazan ni se deforman. Un solo pulso por pieza.
- Rige también transiciones de edición, web y micro-interacciones.

## Voz
Concreta, autoral, actual. Menos adjetivos, más decisiones visibles.
**Todo titular termina en punto.** En piezas señal ese punto final puede ser rojo — y entonces es la señal.
Evitar: "soluciones innovadoras", "revolucionamos con IA", "donde los límites dejan de existir".

## Pendientes del manual (bloqueantes para declarar v1.0)
Clearance legal · handle y dominio · prueba externa de lectura · responsable de marca ·
reconstrucción de idents en pipeline propio · banco de imagen.
No presentar la marca como registralmente cerrada.

---

## Aplicado en el sitio (25-08-2026)

**Ámbito: sólo `/productora`.** El resto del sitio sigue en BALOSKY.

`src/styles/productora.css` es layout compartido — lo usan `/productora` **y `/cameo`**
(y `ProductoraFooter` se monta en las dos). Por eso el skin BLSK. no se aplicó
reescribiendo el archivo, sino como **opt-in por clase**:

- `.prod-page` declara los tokens de BALOSKY (`--prod-accent: #fa5d29`,
  `--prod-mono: JetBrains Mono`, easing con rebote).
- `.prod-page.blsk` / `.prod-foot.prod-foot--blsk` los pisan con los de BLSK.
  La clase `blsk` la ponen sólo `Productora.tsx` y `ProductoraFooter` cuando
  `pathname === '/productora'`.
- Tinta y marfil quedaron unificados en los valores BLSK (`#0a0a0a` / `#f3f0e8`):
  la diferencia con los de BALOSKY era de 1-2/255, invisible.

Qué cambió en `/productora`:

| | antes | ahora |
|---|---|---|
| acento | `#FA5D29` | `#FF3B1F` (señal) |
| mono | JetBrains Mono | IBM Plex Mono |
| easing | `(0.3,0,0.2,1)` + rebote | `(0.3,0,0.05,1)`, sin rebote |
| wordmark hero | texto "Balosky Productora" + punto rojo | SVG maestra mono + "Productora" |
| wordmark footer | texto "Balosky" en outline | SVG maestra mono |
| header | logo BALOSKY, CTA naranja | logo BLSK. (mask, hereda color) + CTA señal |
| firma | `© Balosky` | `© BLSK. · Dirección: Balosky` |
| OG/meta | "Balosky Productora", 223K | "BLSK. — video para marcas", 234K |

Los titulares ya terminaban todos en punto — no hubo que tocar copy.

### Dos correcciones que salieron del rebrand
- El toggle de sonido del hero compartía `left`/`top` con el kicker y lo pisaba.
  Se movió a la derecha.
- El número del eyebrow en rojo sobre marfil daba 3,1:1 — lo que el manual
  prohíbe para texto chico, y además falla AA. En las bandas claras
  (`--intro`, `--contact`) ahora va en tinta. Esto también arregla `/cameo`,
  donde el naranja sobre marfil era peor (2,8:1).

### La regla de una sola señal — aplicada

El rebrand inicial migró la paleta pero no la proporción: la página usaba el
acento como color de énfasis general (herencia del naranja), con 4 a 20 rojos
por banda. Ahora cada banda tiene **exactamente uno**.

Criterio: **donde hay un CTA sólido, el CTA es la señal** (es el gesto
comercial). Donde no lo hay, la señal es el número o el titular de la banda.
Lo neutralizado pasa a marfil si era jerarquía, a gris si era dato.

| banda | antes | ahora | la señal es |
|---|---|---|---|
| hero | 2 | 1 | el CTA sólido |
| 01 enfoque | 1 | 0 | — (banda clara, ver contraste) |
| prensa | 4 | 1 | "Met Gala argentina" |
| ticker | 1 | 1 | la franja entera |
| 02 formatos | ~20 | 1 | el CTA del pack destacado |
| 03 trabajos | 7 | 1 | el número `03` |
| 04 cómo trabajo | ~11 | 1 | el número `04` |
| 05 consulta | 1 | 1 | el submit |
| footer | 5 | 1 | el CTA |

Todo va scopeado bajo `.blsk`, así que `/cameo` conserva su densidad de naranja.

**Dos decisiones que valen la pena revisar:**

1. **El `<em>` del h1 pasó a contorno.** "la pieza entera" era el segundo rojo
   del hero. En vez de aplanarlo se le puso `-webkit-text-stroke` en marfil —
   el mismo recurso del wordmark de cierre y del OG card. Conserva el énfasis
   sin gastar la señal.
2. **El CTA del header pasó a contorno.** Es el cambio con impacto comercial:
   el header flota sobre *todas* las bandas, así que mientras su pastilla fuera
   roja cada banda tenía dos señales y la regla no se sostenía en ninguna. Ahora
   va en contorno y se llena de rojo en hover. Si preferís la pastilla roja
   siempre, es un bloque en `productora.css` (`.nav--blsk .pill-live--cta`) y la
   regla pasa a valer "una señal por banda además del header".

También apareció un rojo suelto que no era de ninguna paleta: `#ff3b3b` en el
punto "EN VIVO" del pack de canal. Bajo BLSK. va en marfil — el pulso ya
comunica "vivo" sin gastar la señal. `/cameo` lo mantiene.

### El OG card — hecho

`public/og-blsk-productora.jpg`: base negra, tipografía marfil, wordmark en
maestra mono y **una sola señal** — el punto final del titular, que es el gesto
que el manual habilita explícitamente. Conserva el copy y la composición del
card original; sólo cambia el sistema visual.

Se genera con `scripts/build-blsk-og.mjs`, que arma un HTML autocontenido (el
logo va embebido en base64) para capturar a 1200x630 en un navegador de verdad
y después pasarlo a JPG con `sharp`. El render no se hace con `sharp` solo
porque Inter Tight e IBM Plex Mono no están instaladas en el sistema y librsvg
las sustituiría.

El card viejo (`public/og-productora.jpg`) **queda en disco**: sólo se dejó de
referenciar desde `/productora`, así que volver atrás es una línea. `/reel` no
entró en el rebrand y lo sigue usando.

### Ajuste de escala del wordmark de cierre
"BLSK." es más corta y compacta que "Balosky", así que a ancho completo el SVG
quedaba el doble de alto que el texto que reemplazó (427 px vs ~220 px) y se
comía el 41 % del footer. Quedó en `min(100%, 880px)` → 326 px, 35 %.
