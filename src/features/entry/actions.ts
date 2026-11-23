"use server";

import * as z from "zod";
import { isNearVenue, isLatLng } from "@/domain/venue-pass";
import { getCurrentUser } from "@/server/auth";
import { grantVenuePass } from "@/server/venue-pass";
import { getVenue } from "./queries";

// Location check-in (when the player cannot read the gym's QR code). The position is only
// compared with the gym's position; it is never stored.

export type CheckInState = { ok?: boolean; message?: string };

const Schema = z.object({
  venue: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(100_000),
});

export async function checkInByLocation(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  if (!(await getCurrentUser())) {
    return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };
  }
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !isLatLng(parsed.data)) {
    return { message: "位置情報を受け取れませんでした。もう一度お試しください。" };
  }
  const venue = await getVenue(parsed.data.venue);
  if (!venue) return { message: "ジムが見つかりません。" };
  if (!venue.location) {
    return {
      message:
        "このジムは位置情報での確認に対応していません。ジムに貼ってある QR コードを読んでください。",
    };
  }
  if (!isNearVenue(parsed.data, parsed.data.accuracy, venue.location)) {
    return {
      message: `${venue.name} の近くにいることを確認できませんでした。ジムの中で、もう一度お試しいただくか、QR コードを読んでください。`,
    };
  }
  await grantVenuePass(venue.id, "location");
  return { ok: true, message: "確認できました。" };
}
