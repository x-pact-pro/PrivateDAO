import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrivateDAO",
    short_name: "PrivateDAO",
    description: "Sovereign encrypted intelligence infrastructure for Solana: private governance, confidential payroll, encrypted payments, Android execution, GamingDAO rewards, and reviewer-safe Testnet proof.",
    start_url: "/",
    display: "standalone",
    background_color: "#030510",
    theme_color: "#030510",
    categories: ["business", "finance", "productivity"],
    orientation: "any",
    icons: [
      {
        src: "/assets/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/brand/privatedao-avatar-256.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/assets/privatedao-social-card.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "PrivateDAO encrypted Solana operations overview",
      },
      {
        src: "/assets/private-dao-product-overview-poster.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "PrivateDAO product lanes and proof flow",
      },
    ],
  };
}
