'use client';

import * as React from 'react';
import { Mail } from 'lucide-react';

/**
 * Renders a contact email without ever putting the literal `user@domain` string
 * (or a `mailto:` with it) into the server HTML — the address is assembled in
 * the browser after mount. This keeps it clickable for real users while denying
 * it to email-harvesting bots and static SEO auditors ("an email is displayed
 * on the page" warning). Pre-hydration it shows a human-readable, non-harvestable
 * form ("user [at] domain"), so there's no hydration mismatch.
 */
export function ObfuscatedEmail({ user, domain }: { user: string; domain: string }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  const address = `${user}@${domain}`;
  const rowClass =
    'group flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary';
  const iconClass =
    'flex size-8 items-center justify-center rounded-lg bg-background ring-1 ring-border transition-colors group-hover:ring-primary/40';

  const inner = (
    <>
      <span className={iconClass}>
        <Mail className="size-4" />
      </span>
      <span dir="ltr">{ready ? address : `${user} [at] ${domain}`}</span>
    </>
  );

  // Only becomes a real mailto link after hydration.
  return ready ? (
    <a href={`mailto:${address}`} className={rowClass}>
      {inner}
    </a>
  ) : (
    <span className={rowClass}>{inner}</span>
  );
}
