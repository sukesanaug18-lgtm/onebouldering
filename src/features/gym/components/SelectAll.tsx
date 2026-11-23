"use client";

/** Checks or unchecks every record checkbox that belongs to the bulk-approve form. */
export function SelectAll({ form }: { form: string }) {
  const boxes = () => [
    ...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${form}"]`),
  ];
  return (
    <button
      type="button"
      onClick={() => {
        const list = boxes();
        const on = list.some((b) => !b.checked);
        for (const b of list) b.checked = on;
      }}
      className="min-h-11 px-2 text-sm font-bold whitespace-nowrap text-text-2 underline underline-offset-4 hover:text-text"
    >
      すべて選ぶ／外す
    </button>
  );
}
