/** Round status labels (shared by server and client code). */
export const ROUND_STATUS = {
  upcoming: "準備中",
  entry_open: "受付中",
  entry_closed: "締切済み",
  completed: "終了",
} as const;
export type RoundStatus = keyof typeof ROUND_STATUS;
