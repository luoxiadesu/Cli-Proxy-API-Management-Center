// Pure read/write helpers for the `workbuddy` config section. No React imports:
// the visual editor hook and its tests consume these directly.

import type { VisualConfigValidationErrorCode } from '@/types/visualConfig';
import {
  WORKBUDDY_TASK_NAMES,
  type WorkBuddyTaskDraft,
  type WorkBuddyTaskEnabled,
} from '@/types/workBuddy';
import { goDurationSeconds } from './visualConfigAdditions';

const DAILY_AT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `true` → enabled, `false` → disabled, anything else (omitted/invalid) → backend default. */
export function parseWorkBuddyEnabled(raw: unknown): WorkBuddyTaskEnabled {
  if (raw === true) return 'enabled';
  if (raw === false) return 'disabled';
  return 'default';
}

export function defaultWorkBuddyTasks(): WorkBuddyTaskDraft[] {
  return WORKBUDDY_TASK_NAMES.map((name) => ({
    name,
    enabled: 'default',
    interval: '',
    dailyAt: '',
    timeout: '',
  }));
}

/** Read `workbuddy.tasks` (plain JS object) into the fixed canonical ten-task list. */
export function readWorkBuddyTasks(raw: unknown): WorkBuddyTaskDraft[] {
  const tasks = asRecord(raw);
  return WORKBUDDY_TASK_NAMES.map((name) => {
    const entry = asRecord(tasks?.[name]);
    return {
      name,
      enabled: parseWorkBuddyEnabled(entry?.['enabled']),
      interval: asString(entry?.['interval']),
      dailyAt: asString(entry?.['daily-at']),
      timeout: asString(entry?.['timeout']),
    };
  });
}

/** Serialize one task, omitting defaults and empty strings so YAML stays minimal. */
export function serializeWorkBuddyTask(task: WorkBuddyTaskDraft): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};
  if (task.enabled !== 'default') serialized.enabled = task.enabled === 'enabled';
  const interval = task.interval.trim();
  const dailyAt = task.dailyAt.trim();
  const timeout = task.timeout.trim();
  if (interval) serialized.interval = interval;
  if (dailyAt) serialized['daily-at'] = dailyAt;
  if (timeout) serialized.timeout = timeout;
  return serialized;
}

export function areWorkBuddyTasksEqual(
  left: WorkBuddyTaskDraft[],
  right: WorkBuddyTaskDraft[]
): boolean {
  if (left.length !== right.length) return false;
  const rightByName = new Map(right.map((task) => [task.name, task]));
  for (const task of left) {
    const other = rightByName.get(task.name);
    if (!other) return false;
    if (
      task.enabled !== other.enabled ||
      task.interval !== other.interval ||
      task.dailyAt !== other.dailyAt ||
      task.timeout !== other.timeout
    ) {
      return false;
    }
  }
  return true;
}

export function getWorkBuddyWorkersError(
  value: string
): VisualConfigValidationErrorCode | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return 'integer_range_0_64';
  const parsed = Number(trimmed);
  return parsed >= 0 && parsed <= 64 ? undefined : 'integer_range_0_64';
}

export function getWorkBuddyDurationError(
  value: string
): VisualConfigValidationErrorCode | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return goDurationSeconds(trimmed) === undefined ? 'invalid_duration' : undefined;
}

export function getWorkBuddyTimezoneError(
  value: string
): VisualConfigValidationErrorCode | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'Local') return undefined;
  try {
    if (/^[+-]/.test(trimmed)) throw new Error('Not an IANA timezone');
    new Intl.DateTimeFormat('en', { timeZone: trimmed });
    return undefined;
  } catch {
    return 'invalid_timezone';
  }
}

function isValidDuration(value: string): boolean {
  return !value.trim() || goDurationSeconds(value.trim()) !== undefined;
}

function isValidDailyAt(value: string): boolean {
  return !value.trim() || DAILY_AT_PATTERN.test(value.trim());
}

export function getWorkBuddyTasksError(
  tasks: WorkBuddyTaskDraft[]
): VisualConfigValidationErrorCode | undefined {
  for (const task of tasks) {
    if (!isValidDuration(task.interval) || !isValidDuration(task.timeout)) {
      return 'invalid_workbuddy_tasks';
    }
    if (!isValidDailyAt(task.dailyAt)) return 'invalid_workbuddy_tasks';
  }
  return undefined;
}

export function getWorkBuddyTaskFieldError(
  task: WorkBuddyTaskDraft,
  field: 'interval' | 'dailyAt' | 'timeout'
): VisualConfigValidationErrorCode | undefined {
  if (field === 'dailyAt') {
    return isValidDailyAt(task.dailyAt) ? undefined : 'invalid_daily_at';
  }
  return isValidDuration(task[field]) ? undefined : 'invalid_duration';
}
