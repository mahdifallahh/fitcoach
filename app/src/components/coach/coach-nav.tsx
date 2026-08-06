"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  MoreHorizontal,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ScrollableTabs } from "@/components/shared/scrollable-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
}

/**
 * The four a coach touches on a normal day — write a program, see who it is
 * for, and answer whoever asked. Everything else is setup you do once, so it
 * lives behind "more" rather than competing for a thumb-sized slot.
 */
const PRIMARY: NavItem[] = [
  { href: "/coach", key: "dashboard", icon: LayoutDashboard },
  { href: "/coach/programs", key: "programs", icon: ClipboardList },
  { href: "/coach/students", key: "students", icon: Users },
  { href: "/coach/requests", key: "requests", icon: Inbox },
];

const SECONDARY: NavItem[] = [
  { href: "/coach/templates", key: "templates", icon: LayoutTemplate },
  { href: "/coach/exercises", key: "exercises", icon: Dumbbell },
  { href: "/coach/intake", key: "intake", icon: FileText },
  { href: "/coach/profile", key: "profile", icon: User },
  { href: "/coach/billing", key: "billing", icon: CreditCard },
  { href: "/coach/help", key: "help", icon: LifeBuoy },
];

const ALL = [...PRIMARY, ...SECONDARY];

/** `/coach` would otherwise match every child route. */
function isActive(pathname: string, href: string): boolean {
  return href === "/coach" ? pathname === "/coach" : pathname.startsWith(href);
}

/** Top tabs — the desktop layout, where horizontal room is not scarce. */
export function CoachNav() {
  const t = useTranslations("coachNav");
  const pathname = usePathname();

  return (
    <ScrollableTabs
      as="nav"
      className="mb-6 hidden border-b sm:block"
      viewportClassName="gap-1"
    >
      {ALL.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, href)
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {t(key)}
        </Link>
      ))}
    </ScrollableTabs>
  );
}

/**
 * Bottom bar — the phone layout.
 *
 * A row of ten scrolling tabs under the header worked on a laptop and badly on a
 * phone: the destinations past the fourth were off-screen with nothing to say so,
 * and all of them sat at the top, the hardest part of a tall screen to reach.
 * This is where a native app puts them, and it is fixed so it survives scrolling.
 */
export function CoachBottomNav() {
  const t = useTranslations("coachNav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Close the sheet when a link inside it navigates.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  const inSecondary = SECONDARY.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label={t("sectionsLabel")}
        // pb-[env(safe-area-inset-bottom)]: on an iPhone the home indicator
        // overlaps the last ~34px, which would sit right on top of the labels.
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="flex items-stretch">
          {PRIMARY.map(({ href, key, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-h-14: a comfortable tap target without a fixed height
                  // that would clip a wrapped label.
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "fill-primary/10")} />
                <span className="max-w-full truncate">{t(key)}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors",
              // Lit when the current page is one of the ones hidden inside, so
              // the bar never claims nothing is selected.
              inSecondary ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="size-5" />
            <span className="max-w-full truncate">{t("more")}</span>
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sectionsLabel")}</DialogTitle>
          </DialogHeader>
          <ul className="grid grid-cols-3 gap-2">
            {SECONDARY.map(({ href, key, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="line-clamp-2">{t(key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
