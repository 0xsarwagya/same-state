import type { MetadataRoute } from "next";

const BASE = "https://same-state.sarwagya.wtf";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];
}
