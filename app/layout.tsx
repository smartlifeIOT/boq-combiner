import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tawal BOQ Processor',
  description: 'Filter site data by TAWAL ID and combine with categories to generate BOQ output sheets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-screen selection:bg-blue-100 selection:text-blue-900`}>
        {children}
      </body>
    </html>
  );
}
