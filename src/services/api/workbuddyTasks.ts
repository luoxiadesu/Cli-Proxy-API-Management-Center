/**
 * WorkBuddy scheduled-task status endpoints (read-only).
 *
 * Backend fields are snake_case; normalize them here so components only ever see
 * camelCase view types. Missing or malformed collections degrade to empty values.
 */

import { apiClient } from './client';
import type { WorkBuddyTaskStatusResponse } from '@/types/workBuddy';
import type {
  WorkBuddyAccountView,
  WorkBuddyTaskSpecView,
  WorkBuddyTaskStatusView,
  WorkBuddyTasksView,
} from '@/features/workbuddyTasks/types';
import { isRecord } from '@/utils/helpers';

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asBoolean = (value: unknown): boolean => value === true;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const asStatus = (value: unknown): 'ok' | 'error' | undefined =>
  value === 'ok' || value === 'error' ? value : undefined;

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? { ...value } : {});

const normalizeTaskStatus = (raw: unknown): WorkBuddyTaskStatusView => {
  const record = isRecord(raw) ? raw : {};
  return {
    lastRun: asString(record.last_run),
    lastWindow: asString(record.last_window),
    lastStatus: asStatus(record.last_status),
    lastError: asString(record.last_error),
    nextRetry: asString(record.next_retry),
    consecutiveFailures: asNumber(record.consecutive_failures),
    data: asRecord(record.data),
  };
};

const normalizeTasks = (raw: unknown): Partial<Record<string, WorkBuddyTaskStatusView>> => {
  if (!isRecord(raw)) return {};
  const tasks: Record<string, WorkBuddyTaskStatusView> = {};
  Object.entries(raw).forEach(([name, value]) => {
    tasks[name] = normalizeTaskStatus(value);
  });
  return tasks;
};

const normalizeAccount = (raw: unknown): WorkBuddyAccountView => {
  const record = isRecord(raw) ? raw : {};
  return {
    authId: asString(record.auth_id) ?? '',
    authIndex: asString(record.auth_index),
    provider: asString(record.provider) ?? '',
    label: asString(record.label) ?? asString(record.auth_id) ?? '',
    uid: asString(record.uid),
    fileName: asString(record.file_name),
    disabled: asBoolean(record.disabled),
    orphan: asBoolean(record.orphan),
    updatedAt: asString(record.updated_at),
    tasks: normalizeTasks(record.tasks),
  };
};

const normalizeSpec = (raw: unknown): WorkBuddyTaskSpecView => {
  const record = isRecord(raw) ? raw : {};
  return {
    name: asString(record.name) ?? '',
    enabled: asBoolean(record.enabled),
    interval: asString(record.interval),
    dailyAt: asString(record.daily_at),
    timeout: asString(record.timeout),
  };
};

const normalize = (raw: WorkBuddyTaskStatusResponse): WorkBuddyTasksView => {
  const source = (raw ?? {}) as unknown as Record<string, unknown>;
  const tasks = Array.isArray(source.tasks) ? source.tasks : [];
  const accounts = Array.isArray(source.accounts) ? source.accounts : [];
  return {
    enabled: asBoolean(source.enabled),
    homeEnabled: asBoolean(source.home_enabled),
    stateDir: asString(source.state_dir),
    timezone: asString(source.timezone),
    observedAt: asString(source.observed_at) ?? '',
    tasks: tasks.map(normalizeSpec),
    accounts: accounts.map(normalizeAccount),
  };
};

export const workbuddyTasksApi = {
  list: async (signal?: AbortSignal) =>
    normalize(
      await apiClient.get<WorkBuddyTaskStatusResponse>(
        '/workbuddy/tasks',
        signal ? { signal } : undefined
      )
    ),
};
