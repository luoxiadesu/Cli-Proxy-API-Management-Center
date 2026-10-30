/** Pure helpers for the WorkBuddy task status page. */

import { WORKBUDDY_TASK_NAMES } from '@/types/workBuddy';
import type {
  WorkBuddyAccountView,
  WorkBuddyTaskRow,
  WorkBuddyTaskStatusView,
  WorkBuddyTaskTone,
} from './types';

const KNOWN_TASK_NAMES = new Set<string>(WORKBUDDY_TASK_NAMES);

const compareStrings = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

/**
 * Fixed ten tasks in canonical order, followed by any unknown task keys sorted
 * alphabetically so new backend task names still surface.
 */
export const buildTaskRows = (account: WorkBuddyAccountView): WorkBuddyTaskRow[] => {
  const tasks = account.tasks ?? {};
  const known: WorkBuddyTaskRow[] = WORKBUDDY_TASK_NAMES.map((name) => ({
    name,
    state: tasks[name],
  }));
  const unknown = Object.keys(tasks)
    .filter((name) => !KNOWN_TASK_NAMES.has(name))
    .sort(compareStrings)
    .map((name) => ({ name, state: tasks[name] }));
  return [...known, ...unknown];
};

/** Sort by label, then auth id, without locale-dependent collation. */
export const sortAccounts = (accounts: WorkBuddyAccountView[]): WorkBuddyAccountView[] =>
  [...accounts].sort(
    (left, right) =>
      compareStrings(left.label, right.label) || compareStrings(left.authId, right.authId)
  );

/** Number of task states whose last status is an error. */
export const countTaskFailures = (accounts: WorkBuddyAccountView[]): number =>
  accounts.reduce(
    (total, account) =>
      total +
      Object.values(account.tasks ?? {}).filter((state) => state?.lastStatus === 'error').length,
    0
  );

export const taskStatusTone = (state?: WorkBuddyTaskStatusView): WorkBuddyTaskTone =>
  state?.lastStatus === 'ok' || state?.lastStatus === 'error' ? state.lastStatus : 'never';

/**
 * Flatten a task's `data` record into stringified primitive entries. Nested
 * objects, arrays and null are skipped; entries are sorted by key.
 */
export const primitiveDataEntries = (
  data: Record<string, unknown> | undefined
): Array<[string, string]> => {
  if (!data) return [];
  return Object.keys(data)
    .sort(compareStrings)
    .reduce<Array<[string, string]>>((entries, key) => {
      const value = data[key];
      if (
        value === null ||
        value === undefined ||
        typeof value === 'object' ||
        typeof value === 'function' ||
        typeof value === 'symbol'
      ) {
        return entries;
      }
      entries.push([key, String(value)]);
      return entries;
    }, []);
};
