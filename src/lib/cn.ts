import { twMerge } from "tailwind-merge";

/** Joins class names, skipping falsy values. Later Tailwind classes win (e.g. px-1 + px-3 = px-3). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
