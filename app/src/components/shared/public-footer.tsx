import { getTranslations } from 'next-intl/server';
import { Dumbbell, GraduationCap, HelpCircle, Info, Newspaper, Phone } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Logo } from './logo';
import { BaleIcon, InstagramIcon, TelegramIcon } from './brand-icons';

/** Owner contact channels. Central so the header/other pages can reuse them. */
export const CONTACT = {
  phoneDisplay: '09356995806',
  phoneHref: 'tel:+989356995806',
  instagram: 'https://instagram.com/fitlo.ir',
  telegram: 'https://t.me/fitlo',
  bale: 'https://ble.ir/fitlo',
};

/** Marketing footer shared by the landing, blog and about pages. */
export async function PublicFooter() {
  const t = await getTranslations('footer');

  const explore = [
    { href: '/about', label: t('about'), icon: Info },
    { href: '/#faq', label: t('faq'), icon: HelpCircle },
    { href: '/blog', label: t('blog'), icon: Newspaper },
  ];
  const accounts = [
    { href: '/login?role=coach', label: t('coachLogin'), icon: Dumbbell },
    { href: '/login?role=student', label: t('studentLogin'), icon: GraduationCap },
  ];
  const socials = [
    { href: CONTACT.instagram, label: t('instagram'), Icon: InstagramIcon },
    { href: CONTACT.telegram, label: t('telegram'), Icon: TelegramIcon },
    { href: CONTACT.bale, label: t('bale'), Icon: BaleIcon },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand + contact */}
        <div className="md:col-span-2">
          <Logo size="lg" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t('tagline')}</p>

          {/* Phone */}
          <a
            href={CONTACT.phoneHref}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <Phone className="size-4" />
            <span dir="ltr">{CONTACT.phoneDisplay}</span>
          </a>

          {/* Social icons */}
          <div className="mt-4 flex items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        </div>

        <FooterColumn heading={t('exploreHeading')} items={explore} />
        <FooterColumn heading={t('accountHeading')} items={accounts} />
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-sm text-muted-foreground sm:flex-row">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <span>{t('madeWith')}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  items,
}: {
  heading: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{heading}</h2>
      <ul className="space-y-2">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
