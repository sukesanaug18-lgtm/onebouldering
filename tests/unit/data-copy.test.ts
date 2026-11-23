import { describe, expect, it } from "vitest";
import {
  htmlToNewsBody,
  isOldNewsDoc,
  newsIdFromOld,
  oldNewsToArticle,
  plainSecret,
  USER_PIN_FIELDS,
} from "@/domain/data-copy";
import { parseNewsBody } from "@/domain/news";

describe("htmlToNewsBody", () => {
  it("keeps headings, lists, bold and safe links, and drops styles and other tags", () => {
    const html = `<h2>公式NEWSページを新設</h2>
<p>日頃より <strong>ONE bouldering</strong> にご参加いただき&amp;ありがとうございます。</p>
<div style="background:#FFF7ED;padding:16px;">
  <p style="font-weight:bold;">📢 主な配信内容</p>
  <ul style="margin:0;">
    <li><strong>会場追加：</strong>開催スケジュール</li>
    <li>大会情報</li>
  </ul>
</div>
<p><a href="/competition" style="color:#fff;">👉 スケジュールを見る</a> <a href="javascript:alert(1)">危険</a></p>
<style>p{color:red}</style>`;
    const body = htmlToNewsBody(html);
    expect(body).toBe(
      [
        "## 公式NEWSページを新設",
        "",
        "日頃より **ONE bouldering** にご参加いただき&ありがとうございます。",
        "",
        "📢 主な配信内容",
        "",
        "- **会場追加：**開催スケジュール",
        "- 大会情報",
        "",
        "[👉 スケジュールを見る](/competition) 危険",
      ].join("\n"),
    );
    expect(parseNewsBody(body).map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "list",
      "paragraph",
    ]);
  });
});

it("converts an old site_settings NEWS document", () => {
  expect(isOldNewsDoc("news_20261017_launch", {})).toBe(true);
  expect(isOldNewsDoc("top", {})).toBe(false);
  expect(newsIdFromOld("news_20261017_launch")).toBe("20261017-launch");
  expect(newsIdFromOld("news_a")).toMatch(/^[a-z0-9-]{6,40}$/);
  const a = oldNewsToArticle("news_20261006_tryout_rule", {
    title: "【重要】ルール",
    category: "ルール更新",
    status: "scheduled",
    publishedAt: "2026-10-06",
    content: "<p>本文</p>",
    isPinned: true,
    createdAt: "2026-10-06T12:00:00.000Z",
  });
  expect(a?.id).toBe("20261006-tryout-rule");
  expect(a?.data).toMatchObject({
    title: "【重要】ルール",
    category: "ルール更新",
    status: "published",
    body: "本文",
    isPinned: true,
    copiedFrom: "news_20261006_tryout_rule",
  });
  expect(oldNewsToArticle("news_x", { title: "" })).toBeNull();
  expect(oldNewsToArticle("news_y", { title: "t", category: "謎" })?.data.category).toBe(
    "お知らせ",
  );
});

it("finds plain secrets", () => {
  expect(plainSecret({ pin: "", 暗証番号: 1234 }, USER_PIN_FIELDS)).toBe("1234");
  expect(plainSecret({ pinHash: "x" }, USER_PIN_FIELDS)).toBeNull();
});
