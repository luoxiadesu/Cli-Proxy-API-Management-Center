/** WorkBuddy scheduled-task configuration and read-only status contracts. */

export const WORKBUDDY_TASK_NAMES = [
  'checkin',
  'balance',
  'keepalive',
  'report',
  'growth',
  'travel',
  'night-owl',
  'sweep',
  'compensation',
  'streak',
] as const;

export type WorkBuddyTaskName = (typeof WORKBUDDY_TASK_NAMES)[number];

/** Omitted `enabled` in YAML means the backend default (enabled). */
export type WorkBuddyTaskEnabled = 'default' | 'enabled' | 'disabled';

export type WorkBuddyTaskDraft = {
  name: WorkBuddyTaskName;
  enabled: WorkBuddyTaskEnabled;
  interval: string;
  dailyAt: string;
  timeout: string;
};

export type WorkBuddyTaskStatus = {
  last_run?: string;
  last_window?: string;
  last_status?: 'ok' | 'error' | '';
  last_error?: string;
  next_retry?: string;
  consecutive_failures?: number;
  data?: Record<string, unknown>;
};

export type WorkBuddyAccountStatus = {
  auth_id: string;
  auth_index?: string;
  provider: string;
  label: string;
  uid?: string;
  file_name?: string;
  disabled?: boolean;
  orphan?: boolean;
  updated_at?: string;
  tasks: Partial<Record<WorkBuddyTaskName | string, WorkBuddyTaskStatus>>;
};

export type WorkBuddyTaskSpec = {
  name: string;
  enabled: boolean;
  interval?: string;
  daily_at?: string;
  timeout?: string;
};

export type WorkBuddyTaskStatusResponse = {
  enabled: boolean;
  home_enabled?: boolean;
  state_dir?: string;
  timezone?: string;
  observed_at: string;
  tasks: WorkBuddyTaskSpec[];
  accounts: WorkBuddyAccountStatus[];
};
