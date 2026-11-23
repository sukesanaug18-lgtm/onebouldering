import { MapPin, QrCode } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/Field";
import type { VenueDetail } from "../queries";
import { LocationCheckButton } from "./LocationCheckButton";

// Shown instead of the Tryout / Ranking form until the player has checked in at this gym today,
// with the gym's own QR code or by location. The submit actions check the same pass.

export function VenueGate({
  venue,
  program,
  qr,
}: {
  venue: VenueDetail;
  program: "Tryout" | "Ranking";
  /** "invalid" when an old or wrong QR code was read, "error" when the check failed. */
  qr?: string;
}) {
  return (
    <Card padding="lg" className="bg-white">
      <h2 className="text-lg font-bold">{venue.name} にいることを確認します</h2>
      <p className="mt-2 text-[15px] text-text-2">
        {program}{" "}
        の入力は、ジムの中でだけできます。次のどちらかで確認してください。確認は今日中（夜12時まで）有効です。
      </p>
      {qr && (
        <div className="mt-4">
          <FormMessage tone="error">
            {qr === "error"
              ? "QR コードを確認できませんでした。もう一度読むか、位置情報で確認してください。"
              : "この QR コードは使えません。ジムに貼ってある最新の QR コードを読むか、位置情報で確認してください。"}
          </FormMessage>
        </div>
      )}
      <ol className="mt-6 space-y-6">
        <li className="flex gap-3">
          <QrCode className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden />
          <div>
            <p className="font-bold">ジムの専用 QR コードを読む</p>
            <p className="mt-1 text-sm text-text-2">
              受付やウォールに貼ってある ONE Bouldering の QR
              コードを、スマホのカメラで読んでください。
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden />
          <div className="flex-1">
            <p className="font-bold">QR が読めないときは、位置情報で確認する</p>
            <p className="mt-1 mb-3 text-sm text-text-2">
              ジムの近く（約300m以内）にいるかだけを確かめます。位置情報は保存しません。
            </p>
            <LocationCheckButton venueId={venue.id} />
          </div>
        </li>
      </ol>
    </Card>
  );
}
