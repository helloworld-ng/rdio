import { Figtree } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return <div className={figtree.className}>{children}</div>;
}
