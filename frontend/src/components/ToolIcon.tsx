import { CircleDot, Swords, Users, Layers, UserCheck } from 'lucide-react';
import type { Tool } from '../types';
export const TOOL_ICON: Record<Tool, typeof CircleDot> = { wheel: CircleDot, teams: Swords, groups: Users, groupspin: Layers, select: UserCheck };
export const TOOL_PATH: Record<Tool, string> = { wheel: '/tools/wheel', teams: '/tools/teams', groups: '/tools/groups', groupspin: '/tools/group-spin', select: '/tools/select' };
