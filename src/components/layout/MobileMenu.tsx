"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, Menu, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { GYM_NAV, MENU_GROUPS, isActivePath } from "@/content/navigation";
import { cn } from "@/lib/cn";

/** Menu button + full-width panel for phones and tablets (< lg). */
export function MobileMenu({ account }: { account: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // While open: lock page scroll, close on Escape, move focus into the panel.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-text outline-offset-2 transition-colors duration-200 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-text"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {/* Rendered into <body>: the header's backdrop-filter would otherwise trap position:fixed. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label="メニュー"
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto overscroll-contain border-t border-line bg-white"
              >
                <nav aria-label="メニュー" className="mx-auto max-w-[1200px] px-5 pt-6 pb-32">
                  {MENU_GROUPS.map((group) => (
                    <section key={group.title} className="mb-8">
                      <h2 className="font-display text-xs font-bold tracking-[0.15em] text-text-3 uppercase">
                        {group.title}
                      </h2>
                      <ul className="mt-2 divide-y divide-line">
                        {group.items.map((item) => {
                          const active = !item.external && isActivePath(pathname, item.href);
                          const className = cn(
                            "flex min-h-13 items-center justify-between text-[17px] font-bold transition-colors duration-200",
                            active ? "text-text" : "text-text-2 hover:text-text",
                          );
                          return (
                            <li key={item.href}>
                              {item.external ? (
                                <a
                                  href={item.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={className}
                                >
                                  {item.label}
                                  <ExternalLink className="size-4 text-text-3" aria-hidden />
                                  <span className="sr-only">（新しいタブで開きます）</span>
                                </a>
                              ) : (
                                <Link
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  aria-current={active ? "page" : undefined}
                                  className={className}
                                >
                                  {item.label}
                                  {active && (
                                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                                  )}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}

                  {/* Login state (server-rendered); close the menu when a link inside is used. */}
                  <div
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a")) setOpen(false);
                    }}
                  >
                    {account}
                  </div>

                  <ul className="mt-8">
                    {GYM_NAV.map((item) => (
                      <li key={item.href}>
                        <Button
                          href={item.href}
                          variant="text"
                          className="text-sm text-text-2"
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

const noopSubscribe = () => () => {};
