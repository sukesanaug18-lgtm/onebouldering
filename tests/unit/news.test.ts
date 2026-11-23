import { describe, expect, it } from "vitest";
import {
  isNewsVisible,
  newsExcerpt,
  parseNewsBody,
  safeHref,
  sortNews,
  todayJst,
} from "@/domain/news";

describe("parseNewsBody", () => {
  it("turns the simple marks into blocks", () => {
    const blocks = parseNewsBody(
      "## 日程\n予選は**1月**から。\n詳しくは[TNFC](/tnfc)へ\n\n- 北海道\n- 東北\n\nhttps://example.com/a.",
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "paragraph"]);
    expect(blocks[1]).toEqual({
      type: "paragraph",
      inlines: [
        { type: "text", text: "予選は" },
        { type: "bold", text: "1月" },
        { type: "text", text: "から。" },
        { type: "br" },
        { type: "text", text: "詳しくは" },
        { type: "link", text: "TNFC", href: "/tnfc" },
        { type: "text", text: "へ" },
      ],
    });
    expect(blocks[3]).toEqual({
      type: "paragraph",
      inlines: [
        { type: "link", text: "https://example.com/a", href: "https://example.com/a" },
        { type: "text", text: "." },
      ],
    });
  });

  it("never makes links to unsafe schemes", () => {
    const [p] = parseNewsBody("[押して](javascript:alert(1))");
    expect(p.type === "paragraph" && p.inlines.every((i) => i.type === "text")).toBe(true);
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });
});

it("excerpt, visibility and order", () => {
  expect(newsExcerpt("## 見出し\n- [リンク](/a) と **太字**", 50)).toBe("見出し リンク と 太字");
  expect(todayJst(new Date("2026-11-23T15:30:00Z"))).toBe("2026-11-24");
  expect(isNewsVisible({ status: "published", publishedAt: "2026-11-24" }, "2026-11-23")).toBe(
    false,
  );
  expect(isNewsVisible({ status: "draft", publishedAt: "2026-11-01" }, "2026-11-23")).toBe(false);
  const list = sortNews([
    { id: "a", isPinned: false, publishedAt: "2026-11-20", createdAt: "" },
    { id: "b", isPinned: true, publishedAt: "2026-10-01", createdAt: "" },
    { id: "c", isPinned: false, publishedAt: "2026-11-22", createdAt: "" },
  ]);
  expect(list.map((x) => x.id)).toEqual(["b", "c", "a"]);
});
