import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AEGIS STUDIO — Autonomous DevSecOps & AI Red-Team Platform',
  description: 'A production-grade cybersecurity and AI defense platform powered by Google Gemini and Google Cloud Firestore. Features automated code vulnerability auditing and autonomous prompt injection stress-testing.',
  openGraph: {
    title: 'AEGIS STUDIO — Autonomous DevSecOps & AI Red-Team Platform',
    description: 'Automated DevSecOps code vulnerability auditing and autonomous adversarial AI red-teaming powered by Google Gemini.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AEGIS STUDIO — Autonomous DevSecOps & AI Red-Team Platform',
    description: 'Automated DevSecOps code vulnerability auditing and autonomous adversarial AI red-teaming powered by Google Gemini.',
  },
};

// Force all pages to be server-rendered on demand — prevents Firebase from
// initialising during the Next.js static-page-generation (SSG) build step,
// which would crash with auth/invalid-api-key when env vars aren't present.
export const dynamic = 'force-dynamic';


export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isAbort(e) {
                  if (!e) return false;
                  var m = (e.message || String(e) || '').toLowerCase();
                  var n = (e.name || '').toLowerCase();
                  return n === 'aborterror' || m.includes('bodystreambuffer') || m.includes('aborted');
                }
                window.addEventListener('error', function(e) {
                  if (isAbort(e.error) || (e.message && e.message.toLowerCase().includes('bodystreambuffer'))) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return true;
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (isAbort(e.reason)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
