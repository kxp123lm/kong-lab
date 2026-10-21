import type { Metadata } from 'next';
import { Leaderboard } from '@/components/leaderboard';
export const metadata: Metadata = {title:'联网排行榜'};
export default function Page(){return <Leaderboard/>;}
