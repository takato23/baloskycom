import { useEffect } from 'react';

type PageMetaProps = {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
};

type ManagedNode = {
  node: HTMLMetaElement;
  created: boolean;
  previousContent: string | null;
};

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
  content: string,
): ManagedNode | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const node = existing ?? document.createElement('meta');

  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });

  const previousContent = existing ? existing.getAttribute('content') : null;
  node.setAttribute('content', content);

  if (!existing) {
    document.head.appendChild(node);
  }

  return {
    node,
    created: !existing,
    previousContent,
  };
}

export default function PageMeta({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
}: PageMetaProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    document.title = title;

    const managedNodes = [
      upsertMeta('meta[name="description"]', { name: 'description' }, description),
      upsertMeta('meta[name="keywords"]', { name: 'keywords' }, (keywords ?? []).join(', ')),
      upsertMeta('meta[property="og:title"]', { property: 'og:title' }, ogTitle ?? title),
      upsertMeta(
        'meta[property="og:description"]',
        { property: 'og:description' },
        ogDescription ?? description,
      ),
      upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website'),
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image'),
    ].filter((node): node is ManagedNode => node !== null);

    return () => {
      document.title = previousTitle;

      managedNodes.forEach(({ node, created, previousContent }) => {
        if (created) {
          node.remove();
          return;
        }

        if (previousContent === null) {
          node.removeAttribute('content');
          return;
        }

        node.setAttribute('content', previousContent);
      });
    };
  }, [description, keywords, ogDescription, ogTitle, title]);

  return null;
}
