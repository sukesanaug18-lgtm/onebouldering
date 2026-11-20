import { loadDefaultJapaneseParser } from "budoux";

const parser = loadDefaultJapaneseParser();

/**
 * Japanese text that only wraps between phrases (CLAUDE.md 6-7).
 * BudouX splits the text; line breaks are allowed only at <wbr>.
 */
export function Phrase({ children }: { children: string }) {
  const chunks = parser.parse(children);
  return (
    <span className="[overflow-wrap:anywhere] [word-break:keep-all]">
      {chunks.map((chunk, i) => (
        <span key={i}>
          {i > 0 && <wbr />}
          {chunk}
        </span>
      ))}
    </span>
  );
}
