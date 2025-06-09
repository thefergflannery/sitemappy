import '../styles/globals.css';

export const metadata = {
  title: 'Sitemap Generator',
  description: 'Modern website structure analyzer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}