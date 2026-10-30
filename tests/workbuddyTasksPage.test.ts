import { describe, expect, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import en from '@/i18n/locales/en.json';
import { apiClient } from '@/services/api/client';
import { workbuddyTasksApi } from '@/services/api/workbuddyTasks';
import { WorkBuddyAccountCard } from '@/features/workbuddyTasks/components/WorkBuddyAccountCard';
import {
  buildTaskRows,
  countTaskFailures,
  primitiveDataEntries,
  sortAccounts,
  taskStatusTone,
} from '@/features/workbuddyTasks/logic';
import type {
  WorkBuddyAccountView,
  WorkBuddyTaskStatusView,
} from '@/features/workbuddyTasks/types';
import { WORKBUDDY_TASK_NAMES } from '@/types/workBuddy';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

const rawResponse = {
  enabled: true,
  home_enabled: false,
  state_dir: '/tmp/workbuddy-state',
  timezone: 'Asia/Shanghai',
  observed_at: '2026-10-30T13:00:00Z',
  tasks: [{ name: 'checkin', enabled: true, interval: '24h', daily_at: '08:30', timeout: '30s' }],
  accounts: [
    {
      auth_id: 'workbuddy-uid-1.json',
      auth_index: 'idx-1',
      provider: 'workbuddy',
      label: 'Alice',
      uid: 'uid-1',
      file_name: 'workbuddy-uid-1.json',
      disabled: false,
      orphan: false,
      updated_at: '2026-01-02T03:04:05Z',
      tasks: {
        checkin: {
          last_run: '2026-01-02T03:00:00Z',
          last_window: '2026-01-02',
          last_status: 'ok',
        },
        balance: {
          last_status: 'error',
          last_error: 'boom',
          next_retry: '2026-01-02T04:00:00Z',
          consecutive_failures: 2,
          data: { credit: 12.5, expired_at: '2026-12-31 23:59:59', nested: { a: 1 } },
        },
      },
    },
  ],
};

const accountFixture = (patch: Partial<WorkBuddyAccountView> = {}): WorkBuddyAccountView => ({
  authId: 'workbuddy-uid-1.json',
  authIndex: 'idx-1',
  provider: 'workbuddy',
  label: 'Alice',
  uid: 'uid-1',
  fileName: 'workbuddy-uid-1.json',
  disabled: false,
  orphan: false,
  updatedAt: '2026-01-02T03:04:05Z',
  tasks: {},
  ...patch,
});

const state = (patch: Partial<WorkBuddyTaskStatusView> = {}): WorkBuddyTaskStatusView => ({
  consecutiveFailures: 0,
  data: {},
  ...patch,
});

describe('WorkBuddy tasks API', () => {
  test('calls the read-only endpoint and maps snake_case to camelCase', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue(rawResponse as never);
    try {
      const view = await workbuddyTasksApi.list();
      expect(get).toHaveBeenLastCalledWith('/workbuddy/tasks', undefined);

      expect(view.enabled).toBe(true);
      expect(view.homeEnabled).toBe(false);
      expect(view.stateDir).toBe('/tmp/workbuddy-state');
      expect(view.timezone).toBe('Asia/Shanghai');
      expect(view.observedAt).toBe('2026-10-30T13:00:00Z');
      expect(view.tasks[0]).toMatchObject({
        name: 'checkin',
        interval: '24h',
        dailyAt: '08:30',
        timeout: '30s',
      });

      const account = view.accounts[0];
      expect(account.authId).toBe('workbuddy-uid-1.json');
      expect(account.authIndex).toBe('idx-1');
      expect(account.fileName).toBe('workbuddy-uid-1.json');
      expect(account.updatedAt).toBe('2026-01-02T03:04:05Z');
      expect(account.tasks.checkin?.lastStatus).toBe('ok');
      expect(account.tasks.checkin?.lastRun).toBe('2026-01-02T03:00:00Z');
      expect(account.tasks.balance?.lastStatus).toBe('error');
      expect(account.tasks.balance?.lastError).toBe('boom');
      expect(account.tasks.balance?.nextRetry).toBe('2026-01-02T04:00:00Z');
      expect(account.tasks.balance?.consecutiveFailures).toBe(2);
      expect(account.tasks.balance?.data.credit).toBe(12.5);
    } finally {
      get.mockRestore();
    }
  });

  test('passes the abort signal through and tolerates missing collections', async () => {
    const get = spyOn(apiClient, 'get').mockResolvedValue({ observed_at: 'now' } as never);
    try {
      const signal = new AbortController().signal;
      const view = await workbuddyTasksApi.list(signal);
      expect(get).toHaveBeenLastCalledWith('/workbuddy/tasks', { signal });
      expect(view.tasks).toEqual([]);
      expect(view.accounts).toEqual([]);
      expect(view.homeEnabled).toBe(false);
    } finally {
      get.mockRestore();
    }
  });
});

describe('WorkBuddy tasks logic', () => {
  test('buildTaskRows keeps the fixed ten in order and appends unknown names', () => {
    const rows = buildTaskRows(
      accountFixture({
        tasks: {
          zeta: state(),
          checkin: state({ lastStatus: 'ok' }),
          alpha: state(),
        },
      })
    );
    expect(rows.map((row) => row.name)).toEqual([...WORKBUDDY_TASK_NAMES, 'alpha', 'zeta']);
    expect(rows[0].state?.lastStatus).toBe('ok');
  });

  test('sortAccounts orders by label then auth id', () => {
    const sorted = sortAccounts([
      accountFixture({ label: 'Bob', authId: 'b' }),
      accountFixture({ label: 'Alice', authId: 'z' }),
      accountFixture({ label: 'Alice', authId: 'a' }),
    ]);
    expect(sorted.map((account) => account.authId)).toEqual(['a', 'z', 'b']);
  });

  test('countTaskFailures counts only error states', () => {
    const accounts = [
      accountFixture({
        tasks: { checkin: state({ lastStatus: 'ok' }), balance: state({ lastStatus: 'error' }) },
      }),
      accountFixture({
        authId: 'other',
        tasks: { report: state({ lastStatus: 'error' }), streak: state() },
      }),
    ];
    expect(countTaskFailures(accounts)).toBe(2);
  });

  test('taskStatusTone distinguishes ok, error and never', () => {
    expect(taskStatusTone(state({ lastStatus: 'ok' }))).toBe('ok');
    expect(taskStatusTone(state({ lastStatus: 'error' }))).toBe('error');
    expect(taskStatusTone(state())).toBe('never');
    expect(taskStatusTone(undefined)).toBe('never');
  });

  test('primitiveDataEntries flattens primitives and skips nested values', () => {
    expect(
      primitiveDataEntries({
        credit: 12.5,
        expired_at: '2026-12-31',
        active: true,
        nested: { a: 1 },
        list: [1, 2],
        missing: null,
        unknown: undefined,
      })
    ).toEqual([
      ['active', 'true'],
      ['credit', '12.5'],
      ['expired_at', '2026-12-31'],
    ]);
  });
});

describe('WorkBuddy account card', () => {
  test('renders every task row with statuses, retry column and details', () => {
    const account = accountFixture({
      disabled: true,
      tasks: {
        checkin: state({ lastStatus: 'ok', lastRun: '2026-01-02T03:00:00Z' }),
        balance: state({
          lastStatus: 'error',
          lastError: 'quota request failed',
          nextRetry: '2026-01-02T04:00:00Z',
          consecutiveFailures: 2,
          data: { credit: 12.5 },
        }),
      },
    });

    const markup = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(WorkBuddyAccountCard, { account }))
    );

    Object.values(en.workbuddy.taskNames).forEach((label) => {
      expect(markup).toContain(label);
    });
    expect(markup).toContain(en.workbuddy_tasks.status_ok);
    expect(markup).toContain(en.workbuddy_tasks.status_error);
    expect(markup).toContain(en.workbuddy_tasks.status_never);
    expect(markup).toContain(en.workbuddy_tasks.col_next_retry);
    expect(markup).toContain('quota request failed');
    expect(markup).toContain(en.workbuddy_tasks.account_disabled);
    expect(markup).toContain(en.workbuddy_tasks.none);
    expect(markup).toContain('<caption');
    expect(markup).toContain('scope="col"');
  });
});

describe('WorkBuddy tasks page wiring', () => {
  test('route, navigation and API module reference the tasks endpoint', () => {
    const mainRoutes = readFileSync('src/router/MainRoutes.tsx', 'utf8');
    const layout = readFileSync('src/components/layout/MainLayout.tsx', 'utf8');
    const api = readFileSync('src/services/api/workbuddyTasks.ts', 'utf8');

    expect(mainRoutes).toContain('/workbuddy/tasks');
    expect(layout).toContain('nav.workbuddy_tasks');
    expect(layout).toContain("'/workbuddy/tasks'");
    expect(api).toContain('/workbuddy/tasks');
  });

  test('all locales expose the navigation and page keys with matching tokens', () => {
    const locales = ['en', 'zh-CN', 'zh-TW', 'ru', 'vi', 'ko'] as const;
    const pageKeys = [
      'title',
      'description',
      'refresh',
      'meta_accounts',
      'meta_errors',
      'observed_at',
      'disabled_notice',
      'home_notice',
      'load_failed',
      'unsupported_title',
      'unsupported_description',
      'retry',
      'empty_title',
      'empty_description',
      'empty_action',
      'disconnected_title',
      'disconnected_description',
      'account_disabled',
      'account_orphan',
      'account_updated',
      'tasks_heading',
      'col_task',
      'col_status',
      'col_last_run',
      'col_next_retry',
      'col_failures',
      'col_details',
      'status_ok',
      'status_error',
      'status_never',
      'failures',
      'none',
      'table_caption',
      'details_data',
    ];
    const tokens = (value: string) => (value.match(/\{\{[^}]+\}\}/g) ?? []).sort().join('|');
    type LocaleMessages = {
      nav: Record<string, string>;
      nav_meta: Record<string, string>;
      workbuddy_tasks: Record<string, string>;
    };
    const english = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8')) as LocaleMessages;

    locales.forEach((locale) => {
      const messages = JSON.parse(
        readFileSync(`src/i18n/locales/${locale}.json`, 'utf8')
      ) as LocaleMessages;
      expect(messages.nav.workbuddy_tasks).toBeTruthy();
      expect(messages.nav_meta.workbuddy_tasks).toBeTruthy();
      pageKeys.forEach((key) => {
        expect(messages.workbuddy_tasks[key]).toBeTruthy();
        expect(tokens(messages.workbuddy_tasks[key])).toBe(tokens(english.workbuddy_tasks[key]));
      });
    });
  });
});
