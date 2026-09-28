import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Doably — Find what you can do',
  description: 'Discover practical ways to turn what you can do into something you can earn from.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
