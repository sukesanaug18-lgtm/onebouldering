import { Bell } from "lucide-react";
import { markNotificationsRead } from "../actions";
import { getMyNotifications } from "../queries";
import { shortDate } from "./MySection";

/** Unread notices (Division changes, rejected scores). Hidden when there are none. */
export async function Notifications({ userId }: { userId: string }) {
  const list = await getMyNotifications(userId);
  if (list.length === 0) return null;
  return (
    <section
      aria-label="お知らせ"
      className="rounded-2xl border border-event-tryout/30 bg-event-tryout/5 p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 font-bold">
          <Bell className="size-4" aria-hidden />
          お知らせ（{list.length}件）
        </p>
        <form action={markNotificationsRead}>
          <button
            type="submit"
            className="min-h-11 px-2 text-sm font-bold whitespace-nowrap text-text-2 underline underline-offset-4 hover:text-text"
          >
            既読にする
          </button>
        </form>
      </div>
      <ul className="mt-3 space-y-3">
        {list.map((n) => (
          <li key={n.id} className="rounded-xl bg-white p-4">
            <p className="text-xs text-text-3">{shortDate(n.at)}</p>
            <p className="mt-1 font-bold">{n.title}</p>
            <p className="mt-1 text-sm text-text-2">{n.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
