import { Amiri, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata = {
  title: "Quran Memory Grid | شبكة حفظ القرآن — Yazid Rahmouni",
  description:
    "Memorize Quran surahs through spatial memory and color-coded cards. Practice Juz Amma (جزء عم) with interactive drag & drop testing. Built by Yazid Rahmouni — MuslimWings.",
  keywords: [
    "Quran memorization",
    "حفظ القرآن",
    "Quran memory grid",
    "جزء عم",
    "Juz Amma",
    "Yazid Rahmouni",
    "MuslimWings",
    "Quran practice",
    "Islamic app",
    "memorize Quran online",
    "حفظ القرآن الكريم",
    "تطبيق حفظ القرآن",
  ],
  authors: [{ name: "Yazid Rahmouni", url: "https://muslimwings.com" }],
  creator: "Yazid Rahmouni",
  publisher: "MuslimWings",
  openGraph: {
    title: "Quran Memory Grid | شبكة حفظ القرآن",
    description:
      "Memorize Quran surahs through spatial memory and color-coded cards. Practice Juz Amma (جزء عم) interactively.",
    siteName: "Quran Memory Grid — MuslimWings",
    locale: "en_US",
    alternateLocale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quran Memory Grid | شبكة حفظ القرآن",
    description:
      "Memorize Quran surahs through spatial memory and color-coded cards. By Yazid Rahmouni — MuslimWings.",
  },
  icons: {
    icon: "/muslimwings-logo.png",
    apple: "/muslimwings-logo.png",
  },
  other: {
    "application-name": "Quran Memory Grid",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0c0f14",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="ltr" className={`${amiri.variable} ${ibmPlexSans.variable}`}>
      <head>
        <link rel="icon" href="/muslimwings-logo.png" />
        <meta name="theme-color" content="#0c0f14" />
      </head>
      <body>{children}</body>
    </html>
  );
}
