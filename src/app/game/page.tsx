import type { Metadata } from 'next';
import { GameClient } from '@/components/game-client';
export const metadata: Metadata = {title:{absolute:'瓜瓜物语 · 正在游戏'}};
export default function GamePage() { return <GameClient/>; }
