import type { Metadata } from "next";

import { defaultOgImage, siteDescription, siteKeywords, siteName, siteTitle } from "@/lib/site-brand";

type BuildRouteMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  index?: boolean;
};

export function buildRouteMetadata({
  title,
  description,
  path,
  keywords = [],
  index = true,
}: BuildRouteMetadataInput): Metadata {
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalPath = urlPath === "/" ? "/" : `${urlPath.replace(/\/+$/, "")}/`;
  const fullTitle = `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    keywords: [
      ...siteKeywords,
      ...keywords,
    ],
    alternates: {
      canonical: canonicalPath,
    },
    robots: index
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalPath,
      siteName,
      type: "website",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [defaultOgImage],
    },
    category: "technology",
    applicationName: siteName,
  };
}

export function buildBrandHomeMetadata(): Metadata {
  return {
    title: siteTitle,
    description: siteDescription,
    keywords: siteKeywords,
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName,
      type: "website",
      url: "/",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [defaultOgImage],
    },
    category: "technology",
    applicationName: siteName,
  };
}
