import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { SITE } from "@/lib/seo";
import "./homepage.css";

const figtree = Figtree({
  subsets: ["latin"],
});

const homeDescription =
  "Schedule programs, manage media, hand off to live broadcasts, and keep a single internet radio station running from your own server.";
const homeTitle = "All-in-one internet radio";
const socialTitle = `${SITE.title} - all-in-one internet radio`;

export const metadata: Metadata = {
  description: homeDescription,
  openGraph: {
    description: homeDescription,
    images: [
      {
        alt: SITE.title,
        height: 620,
        url: SITE.image,
        width: 1200,
      },
    ],
    title: socialTitle,
    url: SITE.url,
  },
  title: homeTitle,
  twitter: {
    description: homeDescription,
    images: [SITE.image],
    title: socialTitle,
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return <div className={figtree.className}>{children}</div>;
}
