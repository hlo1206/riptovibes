import './globals.css';

export const metadata = {
  title: 'Ripto Vibes',
  description: 'Personal AI coding workspace powered by Gemini.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
