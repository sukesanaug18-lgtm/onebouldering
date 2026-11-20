"use client";

import Form from "next/form";
import type { Venue } from "../queries";

/** Gym picker for the gym tab. Updates the URL (?view=gym&gym=...) on change. */
export function GymSelect({ venues, value }: { venues: Venue[]; value?: string }) {
  return (
    <Form action="/ranking" className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="view" value="gym" />
      <label htmlFor="gym-select" className="text-sm font-bold text-text-2">
        店舗
      </label>
      <select
        id="gym-select"
        name="gym"
        defaultValue={value ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-11 min-w-56 rounded-full border border-line bg-white px-4 text-[15px] font-bold outline-offset-2 focus-visible:outline-2 focus-visible:outline-text"
      >
        <option value="" disabled>
          店舗を選んでください
        </option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}（{v.region}）
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="min-h-11 rounded-full border border-line px-4 font-bold">
          表示
        </button>
      </noscript>
    </Form>
  );
}
