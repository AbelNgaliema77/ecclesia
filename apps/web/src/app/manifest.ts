import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ecclesia",
    short_name: "Ecclesia",
    description: "Church management for people, teams, attendance and stewardship.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f4",
    theme_color: "#0f4c45",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
