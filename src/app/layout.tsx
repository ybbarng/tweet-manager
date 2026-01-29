import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tweet Eraser',
  description: 'Twitter(X) 트윗 삭제 도구',
};

// 다크 모드 초기화 스크립트 (FOUC 방지를 위해 인라인으로 실행)
const darkModeScript = `
  (function() {
    var stored = localStorage.getItem('theme-mode');
    var isDark = stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    // system 모드일 때 시스템 설정 변경 감지
    if (!stored || stored === 'system') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        var currentStored = localStorage.getItem('theme-mode');
        if (!currentStored || currentStored === 'system') {
          if (e.matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      });
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 다크 모드 FOUC 방지를 위한 인라인 스크립트 */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
