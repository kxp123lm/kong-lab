'use client';
import {usePathname} from 'next/navigation';
import {Nav} from './nav';
import {Footer} from './footer';
export function AppFrame({children}:{children:React.ReactNode}){
 const path=usePathname();
 if(path==='/'||path==='/game')return <main id="main" className="game-app">{children}</main>;
 return <><a href="#main" className="skip-link">跳至内容</a><Nav/><main id="main">{children}</main><Footer/></>;
}
