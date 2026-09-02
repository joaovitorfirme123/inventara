import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inventara",
    short_name: "Inventara",
    description: "Gestão e priorização de inventários.",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    prefer_related_applications: false,
    background_color: "#f3f1e9",
    theme_color: "#173e32",
    orientation: "any",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
