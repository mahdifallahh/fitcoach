/**
 * Enamad (نماد اعتماد الکترونیکی) — the Iranian e-commerce trust seal.
 *
 * Deliberately a raw <img> served directly from `trustseal.enamad.ir`, NOT
 * `next/image`: Enamad verifies the badge by the image being fetched from their
 * host with `referrerPolicy="origin"` and the anti-copy `code` attribute intact,
 * and the click must open their verification page. Proxying/optimizing it through
 * `/_next/image` changes the origin the request is signed from and would break
 * that check — so this bypasses next/image on purpose.
 *
 * Rendered on a white card so the seal stays legible on the dark footer too.
 */
const ENAMAD_ID = '762492';
const ENAMAD_CODE = 'kKuRxS12pVsAeKQSC4te3YugAW2WLbdo';

export function EnamadSeal({ label }: { label: string }) {
  return (
    <a
      href={`https://trustseal.enamad.ir/?id=${ENAMAD_ID}&Code=${ENAMAD_CODE}`}
      target="_blank"
      rel="noopener"
      referrerPolicy="origin"
      aria-label={label}
      title={label}
      className="inline-block rounded-xl bg-white p-2 shadow-sm ring-1 ring-border transition-transform hover:-translate-y-0.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // `code` is a non-standard attribute Enamad's verification reads; it isn't
        // in the img prop types, so spread it through a cast to keep TS happy.
        {...({ code: ENAMAD_CODE } as unknown as React.ImgHTMLAttributes<HTMLImageElement>)}
        src={`https://trustseal.enamad.ir/logo.aspx?id=${ENAMAD_ID}&Code=${ENAMAD_CODE}`}
        alt={label}
        referrerPolicy="origin"
        width={90}
        height={90}
        style={{ cursor: 'pointer' }}
        className="h-auto w-[84px]"
      />
    </a>
  );
}
