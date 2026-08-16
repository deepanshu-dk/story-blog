import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "House of Stories - व्रत कथा और त्योहार",
    template: "%s | House of Stories",
  },
  description: "हिंदी व्रत कथा, त्योहार की कहानियाँ और परंपराएं - सरल और सुंदर तरीके से।",
};

// This site has one deliberately-designed light theme. Declaring colorScheme explicitly
// stops browsers from auto-inverting the page for dark-mode system settings (Chrome/
// Safari's "auto dark for web content"), which otherwise repaints large background areas
// black while leaving white cards untouched - exactly the low-contrast bug this fixes.
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="hi"
      className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-devanagari)] bg-amber-50 text-lg leading-relaxed text-neutral-900">
        {children}
      </body>
    </html>
  );
}
