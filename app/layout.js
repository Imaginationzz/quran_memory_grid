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
  title: "Quran Memory Grid",
  description:
    "Memorize Quran surahs through spatial memory and color-coded cards",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="ltr" className={`${amiri.variable} ${ibmPlexSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
