/** Normalized (camelCase) view types for the read-only WorkBuddy task status page. */

import type { WorkBuddyTaskName } from '@/types/workBuddy';

export type WorkBuddyTaskStatusView = {
  lastRun?: string;
  lastWindow?: string;
  lastStatus?: 'ok' | 'error';
  lastError?: string;
  /** Retry instant after a failure — not the next scheduled run. */
  nextRetry?: string;
  consecutiveFailures: number;
  data: Record<string, unknown>;
};

export type WorkBuddyAccountView = {
  authId: string;
  authIndex?: string;
  provider: string;
  label: string;
  uid?: string;
  fileName?: string;
  disabled: boolean;
  orphan: boolean;
  updatedAt?: string;
  tasks: Partial<Record<WorkBuddyTaskName | string, WorkBuddyTaskStatusView>>;
};

export type WorkBuddyTaskSpecView = {
  name: string;
  enabled: boolean;
  interval?: string;
  dailyAt?: string;
  timeout?: string;
};

export type WorkBuddyTasksView = {
  enabled: boolean;
  homeEnabled: boolean;
  stateDir?: string;
  timezone?: string;
  observedAt: string;
  tasks: WorkBuddyTaskSpecView[];
  accounts: WorkBuddyAccountView[];
};

export type WorkBuddyTaskRow = {
  name: string;
  state?: WorkBuddyTaskStatusView;
};

export type WorkBuddyTaskTone = 'ok' | 'error' | 'never';
