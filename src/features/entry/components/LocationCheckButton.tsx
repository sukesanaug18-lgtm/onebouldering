"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { checkInByLocation, type CheckInState } from "../actions";

// Asks the browser for the current position and sends it once for the comparison with the gym.
// Nothing about the position is kept, on the device or on the server.

const GEO_ERRORS: Record<number, string> = {
  1: "位置情報の利用が許可されていません。ブラウザの設定で許可するか、ジムの QR コードを読んでください。",
  2: "現在地を取得できませんでした。電波のよい場所で、もう一度お試しください。",
  3: "現在地の取得に時間がかかっています。もう一度お試しください。",
};

export function LocationCheckButton({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CheckInState, FormData>(async (prev, fd) => {
    const res = await checkInByLocation(prev, fd);
    if (res.ok) router.refresh();
    return res;
  }, {});
  const [, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  function check() {
    setGeoError("");
    if (!("geolocation" in navigator)) {
      setGeoError("この端末では位置情報を使えません。ジムの QR コードを読んでください。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const fd = new FormData();
        fd.set("venue", venueId);
        fd.set("lat", String(pos.coords.latitude));
        fd.set("lng", String(pos.coords.longitude));
        fd.set("accuracy", String(Math.round(pos.coords.accuracy)));
        startTransition(() => action(fd));
      },
      (err) => {
        setLocating(false);
        setGeoError(GEO_ERRORS[err.code] ?? GEO_ERRORS[2]);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  const busy = locating || pending;
  const message = geoError || state.message;
  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" onClick={check} disabled={busy}>
        <MapPin className="size-4" aria-hidden />
        {locating ? "現在地を確認中…" : pending ? "確認中…" : "位置情報で確認する"}
      </Button>
      {message && (
        <FormMessage tone={state.ok && !geoError ? "success" : "error"}>{message}</FormMessage>
      )}
    </div>
  );
}
