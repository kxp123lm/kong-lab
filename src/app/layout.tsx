import type { Metadata, Viewport } from 'next';
import { AppFrame } from '@/components/app-frame';
import './globals.css';
import './guagua.css';
export const metadata: Metadata = {title:{default:'瓜瓜物语',template:'%s · 瓜瓜物语'},description:'碰一碰，合成新的小惊喜。瓜瓜物语，随时来一局。'};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fff1bd'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
  return <html lang="zh-CN"><body><AppFrame>{children}</AppFrame></body></html>;
}
