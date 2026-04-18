/**
 * Port of `.mesh-bg` + `.grain` from delirio.html.
 *
 * Renders 4 color blobs that drift behind the whole page plus a subtle
 * grain overlay. All visuals are driven by CSS (`src/styles/delirio.css`),
 * so this component is just markup.
 *
 * Mount this once at the Home.tsx root — it's absolutely positioned and
 * uses z-index: 0 so it sits beneath all content.
 */
export default function MeshBg() {
  return (
    <>
      <div className="mesh-bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
