import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { EXAMPLE_EDITS } from '@/modules/photo-editor/example-edits';
import { absoluteUrl, pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ExampleEditCard } from '@/components/photo-editor/example-edit-card';

const TITLE = 'AI Photo Edit Examples — Before & After with Prompts';
const DESCRIPTION =
  'Browse curated AI photo edit examples with before/after images, the exact prompt, and credits used. Powered by GPT Image 2.6-style editing workflows.';

const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: TITLE,
  description: DESCRIPTION,
  url: absoluteUrl('/examples'),
  numberOfItems: EXAMPLE_EDITS.length,
  itemListElement: EXAMPLE_EDITS.map((example, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: example.title,
    description: example.prompt,
    url: absoluteUrl(`/examples#${example.id}`),
  })),
};

function ExamplesPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="mb-3 text-xs font-semibold tracking-widest text-blue-600 uppercase">
          Sample results
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Photo Edit Examples
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Before-and-after edits created by our users, with the prompt and
          credit cost for each. Browse real community results to see what a
          natural-language edit can look like.
        </p>
        <Link
          href="/#editor"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Open the editor
          <ArrowRight className="size-4" />
        </Link>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
          {EXAMPLE_EDITS.map((example) => (
            <div key={example.id} id={example.id} className="h-full">
              <ExampleEditCard example={example} />
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/examples')({
  head: () => ({
    ...pageHead({
      title: TITLE,
      description: DESCRIPTION,
      path: '/examples',
    }),
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(itemListJsonLd),
      },
    ],
  }),
  component: ExamplesPage,
});
