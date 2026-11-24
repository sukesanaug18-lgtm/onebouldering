"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { NewsBody } from "@/features/news/components/NewsBody";
import { resetSitePage, saveSitePage, type SitePageFormState } from "../actions";

const control =
  "mt-2 block w-full rounded-xl border bg-white px-4 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";

/** Edit a page's lead and body, with a live preview. */
export function SitePageForm({
  slug,
  lead: initialLead,
  body: initialBody,
  edited,
}: {
  slug: string;
  lead: string;
  body: string;
  edited: boolean;
}) {
  const [state, action, pending] = useActionState<SitePageFormState, FormData>(saveSitePage, {});
  const [lead, setLead] = useState(initialLead);
  const [body, setBody] = useState(initialBody);
  // When the stored text changes (e.g. "初期の文章に戻す"), show it in the fields; the form
  // itself stays mounted so the save message is kept.
  const [stored, setStored] = useState({ lead: initialLead, body: initialBody });
  if (stored.lead !== initialLead || stored.body !== initialBody) {
    setStored({ lead: initialLead, body: initialBody });
    setLead(initialLead);
    setBody(initialBody);
  }
  const e = state.errors ?? {};
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <form action={action} noValidate className="space-y-6">
          <input type="hidden" name="slug" value={slug} />
          {state.message && (
            <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
          )}
          <div>
            <label htmlFor="f-lead" className="text-sm font-bold">
              リード文（タイトルの下の1〜2行）
            </label>
            <textarea
              id="f-lead"
              name="lead"
              rows={2}
              value={lead}
              onChange={(ev) => setLead(ev.target.value)}
              className={`${control} py-3 leading-relaxed ${e.lead?.length ? "border-status-rejected" : "border-line"}`}
            />
            {e.lead?.[0] && <p className="mt-1.5 text-sm text-status-rejected">{e.lead[0]}</p>}
          </div>
          <div>
            <label htmlFor="f-body" className="flex items-center gap-2 text-sm font-bold">
              本文<span className="text-xs font-medium text-status-rejected">必須</span>
            </label>
            <textarea
              id="f-body"
              name="body"
              rows={24}
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
              aria-describedby="f-body-hint"
              className={`${control} py-3 font-mono text-sm leading-relaxed ${e.body?.length ? "border-status-rejected" : "border-line"}`}
            />
            <p id="f-body-hint" className="mt-1.5 text-xs leading-relaxed text-text-3">
              空行で段落を分けます。<code>## 見出し</code>、<code>- 箇条書き</code>、
              <code>**太字**</code>、<code>[文字](https://…)</code> または{" "}
              <code>[文字](/tnfc)</code> でリンク。NEWS と同じ書き方です。
            </p>
            {e.body?.[0] && <p className="mt-1.5 text-sm text-status-rejected">{e.body[0]}</p>}
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "保存中…" : "保存して公開"}
          </Button>
        </form>
        {edited && (
          <form
            action={resetSitePage}
            onSubmit={(ev) => {
              if (
                !window.confirm(
                  "保存した文章を消して、最初から入っている文章に戻します。よろしいですか？",
                )
              )
                ev.preventDefault();
            }}
          >
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit" variant="text">
              初期の文章に戻す
            </Button>
          </form>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-text-3">プレビュー</p>
        <div className="mt-2 rounded-2xl border border-line bg-white p-6">
          {lead && <p className="mb-6 text-[15px] text-text-2">{lead}</p>}
          <NewsBody body={body} />
        </div>
      </div>
    </div>
  );
}
