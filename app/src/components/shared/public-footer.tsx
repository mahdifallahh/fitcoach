import { getTranslations } from "next-intl/server";
import {
  Dumbbell,
  GraduationCap,
  HelpCircle,
  Info,
  Mail,
  Newspaper,
  Phone,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { BaleIcon, InstagramIcon, TelegramIcon } from "./brand-icons";

/** Owner contact channels. Central so the header/other pages can reuse them. */
export const CONTACT = {
  phoneDisplay: "09356995806",
  phoneHref: "tel:+989356995806",
  email: "support@fitlo.ir",
  emailHref: "mailto:support@fitlo.ir",
  instagram: "https://instagram.com/fitlo.ir",
  telegram: "https://t.me/fitlo",
  bale: "https://ble.ir/fitlo",
};

/** Marketing footer shared by the landing, blog and about pages. */
export async function PublicFooter() {
  const t = await getTranslations("footer");

  const explore = [
    { href: "/about", label: t("about"), icon: Info },
    { href: "/#faq", label: t("faq"), icon: HelpCircle },
    { href: "/blog", label: t("blog"), icon: Newspaper },
  ];
  const accounts = [
    { href: "/login?role=coach", label: t("coachLogin"), icon: Dumbbell },
    {
      href: "/login?role=student",
      label: t("studentLogin"),
      icon: GraduationCap,
    },
  ];
  const socials = [
    { href: CONTACT.instagram, label: t("instagram"), Icon: InstagramIcon },
    { href: CONTACT.telegram, label: t("telegram"), Icon: TelegramIcon },
    { href: CONTACT.bale, label: t("bale"), Icon: BaleIcon },
  ];

  return (
    <footer className="mt-8 border-t bg-gradient-to-b from-muted/20 to-muted/50">
      <div className="container grid gap-10 py-14 md:grid-cols-12">
        {/* Brand + contact */}
        <div className="md:col-span-5">
          <Logo size="lg" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>

          <div className="mt-5 space-y-2.5">
            <a
              href={CONTACT.phoneHref}
              className="group flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-background ring-1 ring-border transition-colors group-hover:ring-primary/40">
                <Phone className="size-4" />
              </span>
              <span dir="ltr">{CONTACT.phoneDisplay}</span>
            </a>
            <a
              href={CONTACT.emailHref}
              className="group flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-background ring-1 ring-border transition-colors group-hover:ring-primary/40">
                <Mail className="size-4" />
              </span>
              <span dir="ltr">{CONTACT.email}</span>
            </a>
          </div>

          {/* Social pills */}
          <div className="mt-5 flex items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex size-10 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-all hover:-translate-y-0.5 hover:text-primary hover:ring-primary/40"
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-1" />
        <FooterColumn
          heading={t("exploreHeading")}
          items={explore}
          className="md:col-span-3"
        />
        <FooterColumn
          heading={t("accountHeading")}
          items={accounts}
          className="md:col-span-3"
        />
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-sm text-muted-foreground sm:flex-row">
          <span>{t("copyright", { year: new Date().getFullYear() })}</span>
          <span>{t("madeWith")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  items,
  className,
}: {
  heading: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {heading}
      </h2>
      <ul className="space-y-2.5">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="size-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
