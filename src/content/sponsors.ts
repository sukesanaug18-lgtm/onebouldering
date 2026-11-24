import type { EventKey } from "@/components/ui/Badge";

// Sponsors per event. TNFC and Ranking have different sponsors, so each event page shows its
// own (sponsor logos: 03_onebouldering用/04_ロゴ・スポンサー素材, TNFC list: the 2027 poster).
// A sponsor without a logo file is shown as its name.

export type Sponsor = { name: string; logo?: string; url?: string };

export const EVENT_SPONSORS: Record<EventKey, Sponsor[]> = {
  tnfc: [
    { name: "THE NORTH FACE" },
    { name: "Jazzy Sport" },
    { name: "New-HALE", logo: "/images/logos/newhale.png" },
    { name: "LA SPORTIVA" },
    { name: "Vibram" },
  ],
  tryout: [],
  ranking: [
    { name: "New-HALE", logo: "/images/logos/newhale.png" },
    { name: "re:white", logo: "/images/logos/rewhite.png" },
    { name: "SAVAS", logo: "/images/logos/savas_logo.png" },
  ],
};
