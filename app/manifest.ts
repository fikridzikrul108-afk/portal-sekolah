import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Portal Akademik SD Islam Al-Barkah",
    short_name: "Portal Al-Barkah",
    description: "Portal Akademik SD Islam Al-Barkah",
    start_url: "/",
    scope: "/",
    // Meminta browser membuka PWA tanpa toolbar/judul browser.
    display: "fullscreen",
    background_color: "#ffffff",
    // Warna biru dipakai sebagai fallback bila browser tidak mendukung fullscreen.
    theme_color: "#075bd8",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
