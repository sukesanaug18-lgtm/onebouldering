import Link from "next/link";
import type { ReactNode } from "react";
import { type Inline, parseNewsBody } from "@/domain/news";

// Renders an article body as React elements (no HTML from the database). Used by the public
// article page and by the live preview in the office form.

function renderInline(items: Inline[]): ReactNode[] {
  return items.map((it, i) => {
    switch (it.type) {
      case "br":
        return <br key={i} />;
      case "bold":
        return <strong key={i}>{it.text}</strong>;
      case "link":
        return it.href.startsWith("/") ? (
          <Link key={i} href={it.href} className="font-bold underline underline-offset-4">
            {it.text}
          </Link>
        ) : (
          <a
            key={i}
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold break-all underline underline-offset-4"
          >
            {it.text}
          </a>
        );
      default:
        return it.text;
    }
  });
}

export function NewsBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-base leading-[1.9]">
      {parseNewsBody(body).map((b, i) => {
        if (b.type === "heading")
          return (
            <h2 key={i} className="pt-4 text-xl leading-snug font-bold tracking-tight">
              {b.text}
            </h2>
          );
        if (b.type === "list")
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{renderInline(b.inlines)}</p>;
      })}
    </div>
  );
}
