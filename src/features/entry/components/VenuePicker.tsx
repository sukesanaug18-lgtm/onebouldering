"use client";

import Form from "next/form";

type Option = { id: string; name: string; region: string };

/** Gym picker for /entry and /tryout when the QR link has no (valid) venue. */
export function VenuePicker({ action, venues }: { action: string; venues: Option[] }) {
  return (
    <Form action={action} className="space-y-3">
      <label htmlFor="venue-select" className="block text-sm font-bold text-text-2">
        参加しているジム
      </label>
      <select
        id="venue-select"
        name="venue"
        defaultValue=""
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] font-bold outline-offset-2 focus-visible:outline-2 focus-visible:outline-text"
      >
        <option value="" disabled>
          ジムを選んでください
        </option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}（{v.region}）
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="min-h-11 rounded-full border border-line px-4 font-bold">
          進む
        </button>
      </noscript>
    </Form>
  );
}
