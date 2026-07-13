/**
 * Renders a JSON-LD structured-data block. Server-safe: the object is our own
 * controlled data (no user input), serialized with a `<` escape to avoid breaking
 * out of the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
