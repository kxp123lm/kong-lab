import type { Metadata } from 'next';
import { Admin } from '@/components/admin';
export const metadata:Metadata={title:'实验室管理',robots:{index:false,follow:false}};
export default function Page(){return <Admin/>;}
