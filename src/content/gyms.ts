// Member gyms with logos (from the current site). Names come from the logo file names.
// The real list moves to Firestore (venues) in the data step.

/** `dark`: the logo is white, so it is shown on a dark tile. */
export type Gym = { name: string; logo: string; dark?: boolean };

export const GYMS: Gym[] = [
  { name: "D Bouldering Kushiro", logo: "/gym-logos/01-d-bouldering-kushiro.png" },
  { name: "HOMIE REDBRICK WAREHOUSE", logo: "/gym-logos/01-homie-redbrick-warehouse.png" },
  { name: "WHIPPER SNAPPER GYM", logo: "/gym-logos/01-whipper-snapper-gym.png", dark: true },
  { name: "BOLZ", logo: "/gym-logos/02-bolz.png" },
  { name: "CRAGERS", logo: "/gym-logos/02-cragers.png" },
  { name: "Climbon Climbing", logo: "/gym-logos/02-climbon-climbing.png" },
  { name: "FLAT bouldering", logo: "/gym-logos/02-flat-bouldering.png", dark: true },
  { name: "MOVEMENT", logo: "/gym-logos/02-movement.png" },
  { name: "AO roc climbing", logo: "/gym-logos/03-ao-roc-climbing.png" },
  { name: "BASE CAMP KINSHICHO", logo: "/gym-logos/03-base-camp-kinshicho.png", dark: true },
  { name: "BASE CAMP SHINBASHI", logo: "/gym-logos/03-base-camp-shinbashi.png" },
  { name: "PERADRA YOKOHAMA", logo: "/gym-logos/03-peradra-yokohama.png" },
  { name: "Share", logo: "/gym-logos/03-share.png", dark: true },
  { name: "Addict Climbing", logo: "/gym-logos/04-addict-climbing.png" },
  { name: "Climbing JAM", logo: "/gym-logos/04-climbing-jam.png" },
  { name: "Climbing JAM 2 HAMAMATSU", logo: "/gym-logos/04-climbing-jam-2-hamamatsu.png" },
  { name: "Play Mountain", logo: "/gym-logos/04-play-mountain.png" },
  { name: "RAY", logo: "/gym-logos/04-ray.png" },
  { name: "CRUX", logo: "/gym-logos/05-crux.png" },
  { name: "HINOTAMAWALL", logo: "/gym-logos/05-hinotamawall.png" },
  { name: "KEY BOULDERING", logo: "/gym-logos/05-key-bouldering.png" },
  { name: "Luvrock", logo: "/gym-logos/05-luvrock.png" },
  { name: "ROCKMATE", logo: "/gym-logos/05-rockmate.png" },
  { name: "WABO", logo: "/gym-logos/05-wabo.png" },
  { name: "cocomo", logo: "/gym-logos/05-cocomo.png" },
  { name: "AWESOME", logo: "/gym-logos/06-awesome.png" },
  { name: "Bare Hands", logo: "/gym-logos/06-bare-hands.png" },
  { name: "DB KUMAMOTO OYAMA", logo: "/gym-logos/06-db-kumamoto-oyama.png", dark: true },
  { name: "OD", logo: "/gym-logos/06-od.png" },
  { name: "Sunny Side", logo: "/gym-logos/06-sunny-side.png", dark: true },
];
