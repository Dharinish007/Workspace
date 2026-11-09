import { ActivityLogEvent, ActivityAction, SessionSource } from '../types';

export function createActivityLogEvent(
  action: ActivityAction,
  entityId: string,
  options: {
    entity?: 'timer_session' | 'timer_cycle' | 'task' | 'settings';
    diff?: { before?: any; after?: any };
    source?: SessionSource | 'system';
    timestamp?: number;
  } = {}
): ActivityLogEvent {
  const {
    entity = 'timer_session',
    diff,
    source = 'timer',
    timestamp = Date.now(),
  } = options;

  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'act_' + Math.random().toString(36).substring(2, 11) + '_' + timestamp;

  return {
    id,
    timestamp,
    entity,
    entityId,
    action,
    diff,
    source,
  };
}

