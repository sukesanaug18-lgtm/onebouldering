/** Dev-only marker for sections still showing sample data. Hidden in production builds. */
export function SampleNote() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <p className="mt-4 inline-flex rounded-full border border-dashed border-status-pending/50 px-3 py-1 text-xs text-status-pending">
      サンプル表示（データ移行後に実データへ切り替え）
    </p>
  );
}
