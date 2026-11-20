import type { EventKey } from "@/components/ui/Badge";

/**
 * Content for one event page. All three pages share the same structure (CLAUDE.md 5):
 * overview → categories → steps → schedule → rules → FAQ → join button.
 */
export type EventPageContent = {
  key: EventKey;
  name: string;
  kind: string;
  lead: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Three key facts shown as large numbers / words. */
  facts: { value: string; unit?: string; label: string }[];
  overview: string[];
  categories: { title: string; items: string[]; note?: string }[];
  steps: { title: string; text: string }[];
  schedule: { text: string; places?: { label: string; value: string }[] };
  rules: { title: string; items: string[] }[];
  tables?: { caption: string; head: string[]; rows: string[][]; note?: string }[];
  faq: { q: string; a: string }[];
};
