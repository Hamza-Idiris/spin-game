import { CircleDot, Swords, Users } from 'lucide-react';
import type { Tool } from '../types';
export const TOOL_ICON: Record<Tool, typeof CircleDot> = { wheel: CircleDot, teams: Swords, groups: Users };
export const TOOL_PATH: Record<Tool, string> = { wheel: '/tools/wheel', teams: '/tools/teams', groups: '/tools/groups' };
