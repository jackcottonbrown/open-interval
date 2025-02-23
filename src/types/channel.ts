import { BaseInterval, OverlayInterval } from '@/db/schema';

export type BaseChannel = {
  id: string;
  type: 'base';
  name: string;
  volume: number;
  intervals: BaseInterval[];
};

export type OverlayChannel = {
  id: string;
  type: 'tutorial' | 'encouragement' | 'custom';
  name: string;
  volume: number;
  intervals: OverlayInterval[];
};

export type Channel = BaseChannel | OverlayChannel; 