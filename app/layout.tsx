import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Stream Detector MV3 - Extension Developer Hub',
  description: 'An interactive developer suite to customize, simulate, and download a powerful Manifest V3 Chrome Extension that intercepts and captures streaming media playlists and APIs.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
