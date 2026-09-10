import type { Metadata, Viewport } from 'next';
import './globals.css';
import MobileSupport from './mobile-support';
export const metadata: Metadata = {
  title: '拾课 · 我的一周',
  description:
    '适合每个人的周课表：自定义作息、按周管理课程、登录后跨设备同步。',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '拾课' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#315cdd',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}<MobileSupport/></body>
    </html>
  );
}
