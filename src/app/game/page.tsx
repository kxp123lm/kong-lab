import type { Metadata } from 'next';
import { GameClient } from '@/components/game-client';
export const metadata: Metadata = {title:'合成大西瓜'};
export default function GamePage() { return <GameClient/>; }
