import type { Metadata } from 'next';
import Lobby from '@/components/Lobby';
import JsonLd from '@/components/JsonLd';
import { GAMES } from '@/lib/games';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: 'en' },
    {
      '@type': 'ItemList',
      name: `${SITE_NAME} games`,
      itemListElement: GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: `${SITE_URL}${g.href}` })),
    },
  ],
};

export default function Page() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <Lobby />
    </>
  );
}
