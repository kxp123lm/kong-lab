import type {Metadata,Viewport} from 'next';
import {Nav} from '@/components/nav';
import {Footer} from '@/components/footer';
import './globals.css';
export const metadata:Metadata={title:{default:'KONG LAB · 孔总实验室',template:'%s · KONG LAB'},description:'一些游戏、一些工具，以及奇奇怪怪的想法。'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#111411'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body><a href="#main" className="skip-link">跳至内容</a><Nav/><main id="main">{children}</main><Footer/></body></html>;}
