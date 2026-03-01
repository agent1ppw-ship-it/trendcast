import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { NextAuthProvider } from '@/app/providers';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'trendcast.io - The Ultimate AI Suite for Home Services',
  description: 'Fully automated lead generation, customer communication, and job management using AI for roofers, landscapers, pressure washers, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth dark">
      <body className={`${inter.className} bg-[#0A0A0A] text-gray-100 antialiased selection:bg-blue-500/30 selection:text-blue-200`}>
        <NextAuthProvider>
          <Navbar />
          <main className="pt-20">
            {children}
          </main>
          <Analytics />
        </NextAuthProvider>
      </body>
    </html>
  );
}
