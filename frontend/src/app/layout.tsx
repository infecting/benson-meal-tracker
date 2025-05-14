import type { Metadata } from 'next';
import './globals.css'; // Make sure this path is correct
import { Navbar } from '../../components/Navbar'; // Use @ alias for src directory

export const metadata: Metadata = {
  title: 'Campus Bites',
  description: 'Student dining services',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <div className="flex">
          <Navbar />
          {/* Main content with left padding to account for the fixed navbar */}
          <main className="flex-1 ml-64 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}