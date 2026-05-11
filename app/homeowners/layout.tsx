import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Homeowner Countertop Services Canada | Repairs, Measurements & Installation | 1800TOPS",
  description:
    "Book fast homeowner countertop services with 1800TOPS. Get countertop estimates, measurements, removals, repairs, sink cutouts, cooktop cutouts, polishing, sealing, backsplash removal, and quick installation turnaround across Canada.",
  keywords: [
    "homeowner countertop services",
    "countertop repair Canada",
    "countertop installation Canada",
    "countertop measurements",
    "countertop estimate",
    "kitchen countertop upgrade",
    "countertop removal",
    "stone countertop removal",
    "laminate countertop removal",
    "backsplash tile removal",
    "sink cutout",
    "cooktop cutout",
    "granite sealing",
    "marble sealing",
    "countertop polishing",
    "1800TOPS",
  ],
  alternates: {
    canonical: "https://1800tops.com/homeowners/book",
  },
  openGraph: {
    title:
      "Homeowner Countertop Services Canada | 1800TOPS",
    description:
      "Fast homeowner countertop estimates, measurements, repairs, removals, cutouts, sealing, polishing, and installation services with quick turnaround options.",
    url: "https://1800tops.com/homeowners/book",
    siteName: "1800TOPS",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Homeowner Countertop Services Canada | 1800TOPS",
    description:
      "Book countertop estimates, measurements, repairs, removals, cutouts, polishing, sealing, and fast homeowner services with 1800TOPS.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomeownersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}