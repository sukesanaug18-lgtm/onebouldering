"use client";

import { AlertTriangle } from "lucide-react";
import { startTransition, useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { divisionName } from "@/domain/division";
import { categorySummary, scoreResults } from "@/domain/tnfc-results";
import { importResults, type ResultImportState } from "../result-actions";

const inputClass =
  "block w-20 rounded-xl border border-line bg-white px-3 py-2 text-right tabular-nums hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text";

/** Reads a CSV file as UTF-8, or Shift_JIS when it is not valid UTF-8 (old-site exports). */
async function readCsvFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("shift_jis").decode(buf);
  }
}

/**
 * 1.2.1 Result import in two steps: check (parse and show finalists / points) → apply.
 * The finals line can be changed per category; the table updates as it changes.
 */
export function ResultImportForm({
  roundId,
  defaultCutoff,
  defaultCutoffs,
  imported,
}: {
  roundId: string;
  defaultCutoff: number;
  defaultCutoffs: Record<string, number>;
  imported: boolean;
}) {
  const [state, action, pending] = useActionState<ResultImportState, FormData>(importResults, {});
  const [csv, setCsv] = useState("");
  const [cutoff, setCutoff] = useState(String(defaultCutoff));
  const [cutoffs, setCutoffs] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(defaultCutoffs).map(([k, v]) => [k, String(v)])),
  );
  const [fileError, setFileError] = useState("");

  const preview = state.applied ? undefined : state.preview;
  const line = Math.max(0, Math.floor(Number(cutoff) || 0));
  const lines = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(cutoffs)
          .filter(([, v]) => v.trim() !== "" && Number.isFinite(Number(v)))
          .map(([k, v]) => [k, Math.max(0, Math.floor(Number(v)))]),
      ),
    [cutoffs],
  );
  const scored = useMemo(
    () => (preview ? scoreResults(preview.rows, line, lines) : []),
    [preview, line, lines],
  );
  const summary = categorySummary(scored);

  function send(mode: "preview" | "apply") {
    const fd = new FormData();
    fd.set("roundId", roundId);
    fd.set("csv", csv);
    fd.set("mode", mode);
    fd.set("cutoff", String(line));
    fd.set("cutoffs", JSON.stringify(lines));
    startTransition(() => action(fd));
  }

  return (
    <div className="space-y-6">
      {state.message && (
        <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="r-file" className="text-sm font-bold">
            リザルトの CSV ファイル
          </label>
          <input
            id="r-file"
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={async (e) => {
              setFileError("");
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) {
                setFileError("ファイルが大きすぎます（2MBまで）。");
                return;
              }
              setCsv(await readCsvFile(f));
            }}
            className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-full file:border file:border-line file:bg-white file:px-4 file:font-bold"
          />
          {fileError && <p className="mt-2 text-sm font-bold text-[#b91c1c]">{fileError}</p>}
        </div>
        <div>
          <label htmlFor="r-csv" className="text-sm font-bold">
            または貼り付け（TNFC Control のリザルトをコピー）
          </label>
          <textarea
            id="r-csv"
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={
              "順位,ID,氏名,カテゴリー\n1,10001,山田 太郎,Division 3\n2,10002,佐藤 花子,Women's Division 2"
            }
            className="mt-2 block w-full rounded-xl border border-line bg-white p-3 font-mono text-sm hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="r-cutoff" className="text-sm font-bold">
              本戦通過ライン（各カテゴリーの上位）
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="r-cutoff"
                inputMode="numeric"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value.replace(/[^\d]/g, ""))}
                className={inputClass}
              />
              <span className="text-sm">位まで</span>
            </div>
          </div>
          <Button
            type="button"
            variant={preview ? "secondary" : "primary"}
            disabled={pending || !csv.trim()}
            onClick={() => send("preview")}
          >
            {pending ? "読み込み中…" : preview ? "読み直す" : "内容を確認する"}
          </Button>
        </div>
      </div>

      {preview && (
        <div className="space-y-5 border-t border-line pt-6">
          {(preview.skippedLines.length > 0 ||
            preview.unknownIds.length > 0 ||
            preview.duplicateIds.length > 0) && (
            <div className="space-y-1 rounded-xl border border-status-pending/40 bg-status-pending/10 p-3 text-sm text-[#a16207]">
              <p className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4" aria-hidden />
                確認してください
              </p>
              {preview.skippedLines.length > 0 && (
                <p>
                  順位かライセンスNoがない行は飛ばしました：{preview.skippedLines.join("・")}行目
                </p>
              )}
              {preview.unknownIds.length > 0 && (
                <p>
                  会員にいないライセンスNo：{preview.unknownIds.join("・")}
                  （ランキングには出ません）
                </p>
              )}
              {preview.duplicateIds.length > 0 && (
                <p>
                  2回出てくるライセンスNo（最初の行を使います）：{preview.duplicateIds.join("・")}
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="font-bold">カテゴリーごとの本戦出場者</h3>
            <p className="mt-1 text-sm text-text-2">
              カテゴリーごとに通過ラインを変えるときは、右の欄に入れてください（空欄なら上の{line}
              位まで）。
            </p>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {summary.map((c) => (
                <li key={c.division} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="min-w-40 flex-1 font-bold">{divisionName(c.division)}</span>
                  <span className="text-sm text-text-2 tabular-nums">
                    {c.count}人 → 本戦 {c.qualified}人
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">{divisionName(c.division)} の通過ライン</span>
                    上位
                    <input
                      inputMode="numeric"
                      value={cutoffs[c.division] ?? ""}
                      placeholder={String(line)}
                      onChange={(e) =>
                        setCutoffs((s) => ({
                          ...s,
                          [c.division]: e.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                      className={inputClass}
                    />
                    位
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-text-3">
                <tr>
                  <th className="py-2 pr-3 font-bold">カテゴリー</th>
                  <th className="py-2 pr-3 text-right font-bold">順位</th>
                  <th className="py-2 pr-3 font-bold">氏名</th>
                  <th className="py-2 pr-3 font-bold">ID</th>
                  <th className="py-2 pr-3 font-bold">本戦</th>
                  <th className="py-2 text-right font-bold">付与pt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scored.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-2 pr-3">{divisionName(r.division)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.rank}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3 text-text-3 tabular-nums">{r.userId}</td>
                    <td className="py-2 pr-3">{r.qualified ? <b>出場</b> : ""}</td>
                    <td className="py-2 text-right tabular-nums">{r.points.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                const msg = imported
                  ? "この大会のリザルトとポイントを、今回の内容で置き換えます。よろしいですか？"
                  : `${scored.length}人のリザルトを確定し、本戦出場者 ${scored.filter((r) => r.qualified).length}人とRanking ポイントを反映します。よろしいですか？`;
                if (window.confirm(msg)) send("apply");
              }}
            >
              {pending ? "反映中…" : "リザルト確定 ＋ Ranking ポイント付与"}
            </Button>
            <p className="text-xs text-text-3">
              付与ポイント＝順位点（1位10,000〜11位以下1,000）×カテゴリー人数の倍率（26人以上×1.2／11〜25人×1.0／3〜10人×0.8／1〜2人×0.5）。ランキングとマイページにすぐ反映されます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
