// Single design system — Artefakt style
// Light/dark handled via CSS variables [data-mode="dark"], not per-theme objects.

export const PAGE_STYLES = {
  shell: 'font-sans',
  pageTitle: 'font-display tracking-[-0.04em]',
  pageSubtitle: 'text-[var(--muted)] font-medium',
  sectionTitle: 'font-display tracking-[-0.03em]',
  panel: 'bg-[var(--grey)] border border-[var(--border)] rounded-none',
  softPanel: 'bg-[var(--grey)] border border-[var(--border)]',
  accentPanel: 'bg-[var(--accent)] text-white border border-[var(--accent)]',
  contrastPanel: 'bg-[var(--black)] text-[var(--white)] border border-[var(--border)]',
  badge: 'bg-[var(--accent)] text-white',
  chip: 'bg-[var(--grey)] text-[var(--muted)] border border-[var(--border)]',
  timelineLine: 'bg-[var(--border)]',
  timelineNode: 'bg-[var(--accent)]',
  primaryButton: 'bg-[var(--black)] text-[var(--white)] hover:bg-[var(--accent)] hover:text-white transition-colors',
  secondaryButton: 'bg-[var(--grey)] text-[var(--black)] border border-[var(--border)] hover:bg-[var(--black)] hover:text-[var(--white)] transition-colors',
  modal: 'bg-[var(--white)] border border-[var(--border)]',
  input: 'w-full p-3 border border-[var(--border)] outline-none font-medium bg-[var(--grey)] focus:bg-[var(--white)] transition-colors',
  emptyState: 'bg-[var(--grey)] border border-[var(--border)] text-[var(--muted)]',
};

export const getPageStyles = () => PAGE_STYLES;
