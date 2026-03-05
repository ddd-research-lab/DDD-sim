import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yu-Gi-Oh! Simulator',
  description: 'Solo play simulator for Yu-Gi-Oh! OCG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
