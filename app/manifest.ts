import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Knit Scripture Study",
    short_name: "Knit",
    description: "Read and study the scriptures together with family and friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#8a5a2b",
    icons: [
      {
        src: "/icons/knit.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/knit.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
