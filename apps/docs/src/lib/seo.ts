import type { Metadata } from "next";

export const SITE = {
  title: "rdio",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://rdio.moonlight.ng",
  description:
    "rdio is a self-hosted control room for internet radio: schedule programs, manage media, hand off live broadcasts, and run your own stream stack.",
  image: "/logo.svg",
} as const;

export const siteMetadata: Metadata = {
  applicationName: SITE.title,
  authors: [{ name: "Moonlight Studios", url: "https://moonlight.ng" }],
  creator: "Moonlight Studios",
  description: SITE.description,
  icons: {
    icon: SITE.image,
  },
  keywords: [
    "rdio",
    "internet radio",
    "self-hosted radio",
    "radio automation",
    "Icecast",
    "Liquidsoap",
    "broadcast tools",
  ],
  metadataBase: new URL(SITE.url),
  openGraph: {
    description: SITE.description,
    images: [
      {
        alt: SITE.title,
        height: 630,
        url: SITE.image,
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: SITE.title,
    title: SITE.title,
    type: "website",
    url: SITE.url,
  },
  publisher: "Moonlight Studios",
  robots: {
    follow: true,
    index: true,
  },
  title: {
    default: SITE.title,
    template: `%s | ${SITE.title}`,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE.description,
    images: [SITE.image],
    title: SITE.title,
  },
};
