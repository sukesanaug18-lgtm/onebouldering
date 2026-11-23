"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import { NEWS_CATEGORIES, todayJst } from "@/domain/news";
import { deleteNews, type NewsFormState, saveNews } from "../actions";
import { NewsBody } from "./NewsBody";

export type NewsFormValues = {
  id: string;
  title: string;
  category: string;
  publishedAt: string;
  body: string;
  status: string;
  isPinned: boolean;
  imageUrl: string | null;
};

const control =
  "mt-2 block w-full rounded-xl border bg-white px-4 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";

function Errors({ id, list }: { id: string; list?: string[] }) {
  return list?.length ? (
    <p id={id} className="mt-1.5 text-sm text-status-rejected">
      {list[0]}
    </p>
  ) : null;
}

/** Write or edit an article, with a live preview of the body. */
export function NewsForm({ values, notice }: { values: NewsFormValues; notice?: string }) {
  const [state, action, pending] = useActionState<NewsFormState, FormData>(saveNews, {});
  const [body, setBody] = useState(values.body);
  const [title, setTitle] = useState(values.title);
  const e = state.errors ?? {};
  const message = state.message ?? notice;
  return (
    <form
      noValidate
      className="grid gap-8 lg:grid-cols-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <div className="space-y-6">
        <input type="hidden" name="id" value={values.id} />
        {message && (
          <FormMessage tone={state.message && !state.ok ? "error" : "success"}>
            {message}
          </FormMessage>
        )}
        <Field
          label="タイトル"
          name="title"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          error={e.title}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="f-category" className="text-sm font-bold">
              カテゴリー
            </label>
            <select
              id="f-category"
              name="category"
              defaultValue={values.category || "お知らせ"}
              className={`${control} min-h-12 border-line`}
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Errors id="f-category-error" list={e.category} />
          </div>
          <Field
            label="公開日"
            name="publishedAt"
            type="date"
            defaultValue={values.publishedAt || todayJst()}
            hint="未来の日付にすると、その日（日本時間）から公開されます。"
            error={e.publishedAt}
            required
          />
        </div>
        <div>
          <label htmlFor="f-body" className="flex items-center gap-2 text-sm font-bold">
            本文<span className="text-xs font-medium text-status-rejected">必須</span>
          </label>
          <textarea
            id="f-body"
            name="body"
            rows={16}
            value={body}
            onChange={(ev) => setBody(ev.target.value)}
            aria-invalid={e.body?.length ? true : undefined}
            aria-describedby="f-body-hint"
            className={`${control} py-3 leading-relaxed ${e.body?.length ? "border-status-rejected" : "border-line"}`}
          />
          <p id="f-body-hint" className="mt-1.5 text-xs leading-relaxed text-text-3">
            空行で段落を分けます。<code>## 見出し</code>、<code>- 箇条書き</code>、
            <code>**太字**</code>、<code>[文字](https://…)</code> または <code>[文字](/tnfc)</code>{" "}
            でリンク。URL はそのままでもリンクになります。
          </p>
          <Errors id="f-body-error" list={e.body} />
        </div>
        <div>
          <label htmlFor="f-image" className="text-sm font-bold">
            画像（任意）
          </label>
          {values.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={values.imageUrl}
              alt=""
              className="mt-2 max-h-48 rounded-xl border border-line"
            />
          )}
          <input
            id="f-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-white file:px-4 file:font-bold"
          />
          {values.imageUrl && (
            <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" name="removeImage" className="size-5 accent-text" />
              画像を外す
            </label>
          )}
          <Errors id="f-image-error" list={e.image} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">公開</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="status"
              value="draft"
              defaultChecked={values.status !== "published"}
              className="size-5 accent-text"
            />
            下書き（公開ページに出さない）
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="status"
              value="published"
              defaultChecked={values.status === "published"}
              className="size-5 accent-text"
            />
            公開する
          </label>
          <label className="flex min-h-11 items-center gap-3 border-t border-line pt-2">
            <input
              type="checkbox"
              name="isPinned"
              defaultChecked={values.isPinned}
              className="size-5 accent-text"
            />
            NEWS 一覧の先頭に固定する
          </label>
        </fieldset>
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存する"}
        </Button>
      </div>

      <section aria-label="プレビュー" className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-bold text-text-3">プレビュー</p>
        <div className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-2xl leading-snug font-bold tracking-tight">
            {title || "（タイトル）"}
          </h2>
          <div className="mt-6">
            {body.trim() ? <NewsBody body={body} /> : <p className="text-text-3">（本文）</p>}
          </div>
        </div>
      </section>
    </form>
  );
}

/** Deletes an article after a confirm dialog. */
export function DeleteNewsButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<NewsFormState, FormData>(deleteNews, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!window.confirm("この記事を削除します。元に戻せません。よろしいですか？"))
          ev.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "削除中…" : "この記事を削除する"}
      </Button>
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
    </form>
  );
}
