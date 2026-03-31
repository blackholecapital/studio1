import { MEDIA_BASE } from "./assetResolver";

export type SkinItem = {
  id: string;
  name: string;
  thumbnail: string;
  className: string;
};

export const skinCatalog: SkinItem[] = [
  { id: "S1", name: "Rainbow",   thumbnail: `${MEDIA_BASE}/skins/S1.png`, className: "skin-s1" },
  { id: "S2", name: "Steel",     thumbnail: `${MEDIA_BASE}/skins/S2.png`, className: "skin-s2" },
  { id: "S3", name: "Flame",     thumbnail: `${MEDIA_BASE}/skins/S3.png`, className: "skin-s3" },
  { id: "S4", name: "Corporate", thumbnail: `${MEDIA_BASE}/skins/S4.png`, className: "skin-s4" },
];
