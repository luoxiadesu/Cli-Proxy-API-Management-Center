import { describe, expect, test } from 'bun:test';
import { parse as parseYaml } from 'yaml';
import { getVisualConfigValidationErrors } from '@/hooks/useVisualConfig';
import { buildConfigPatch } from '@/services/api/configPatch';
import { DEFAULT_VISUAL_VALUES, type VisualConfigValues } from '@/types/visualConfig';
import {
  defaultWorkBuddyTasks,
  getWorkBuddyTaskFieldError,
} from '@/features/config/visualConfigWorkBuddy';
import { WORKBUDDY_TASK_NAMES, type WorkBuddyTaskDraft } from '@/types/workBuddy';
import { runVisualConfig } from './helpers/visualConfig';

const errors = (patch: Partial<VisualConfigValues>) =>
  getVisualConfigValidationErrors({ ...structuredClone(DEFAULT_VISUAL_VALUES), ...patch });

const task = (name: string, patch: Partial<WorkBuddyTaskDraft> = {}): WorkBuddyTaskDraft => ({
  name: name as WorkBuddyTaskDraft['name'],
  enabled: 'default',
  interval: '',
  dailyAt: '',
  timeout: '',
  ...patch,
});

const withTask = (
  tasks: WorkBuddyTaskDraft[],
  name: string,
  patch: Partial<WorkBuddyTaskDraft>
): WorkBuddyTaskDraft[] => tasks.map((item) => (item.name === name ? { ...item, ...patch } : item));

describe('WorkBuddy visual configuration', () => {
  test('empty YAML yields ten default tasks and no dirty fields', () => {
    const config = runVisualConfig('{}');
    expect(config.visualValues.workbuddyTasks.map((item) => item.name)).toEqual([
      ...WORKBUDDY_TASK_NAMES,
    ]);
    for (const item of config.visualValues.workbuddyTasks) {
      expect(item).toEqual({
        name: item.name,
        enabled: 'default',
        interval: '',
        dailyAt: '',
        timeout: '',
      });
    }
    expect(config.visualValues.workbuddyEnabled).toBe(false);
    expect(config.visualValues.workbuddyStateDir).toBe('');
    expect(config.visualValues.workbuddyWorkers).toBe('');
    expect(config.visualValues.workbuddyRequestTimeout).toBe('');
    expect(config.visualValues.workbuddyTimezone).toBe('');
    expect(config.visualDirty).toBe(false);
  });

  test('reads scalars and tri-state task flags, with numbers as strings', () => {
    const config = runVisualConfig(`workbuddy:
  enabled: false
  workers: 4
  state-dir: /var/lib/workbuddy
  request-timeout: 45s
  timezone: Asia/Shanghai
  tasks:
    checkin:
      enabled: false
    report:
      enabled: true
      interval: 24h
      daily-at: "08:00"
      timeout: 30s
`);
    expect(config.visualValues.workbuddyEnabled).toBe(false);
    expect(config.visualValues.workbuddyWorkers).toBe('4');
    expect(config.visualValues.workbuddyStateDir).toBe('/var/lib/workbuddy');
    expect(config.visualValues.workbuddyRequestTimeout).toBe('45s');
    expect(config.visualValues.workbuddyTimezone).toBe('Asia/Shanghai');
    const checkin = config.visualValues.workbuddyTasks.find((item) => item.name === 'checkin');
    expect(checkin?.enabled).toBe('disabled');
    const report = config.visualValues.workbuddyTasks.find((item) => item.name === 'report');
    expect(report).toEqual({
      name: 'report',
      enabled: 'enabled',
      interval: '24h',
      dailyAt: '08:00',
      timeout: '30s',
    });
    const balance = config.visualValues.workbuddyTasks.find((item) => item.name === 'balance');
    expect(balance?.enabled).toBe('default');
    expect(config.visualDirty).toBe(false);
  });

  test('writes only the changed task and preserves unknown names and fields', () => {
    const yaml = `workbuddy:
  tasks:
    unknown-task:
      interval: 1h
    checkin:
      future: keep
      interval: 1h
server:
  port: 9000
`;
    const loaded = runVisualConfig(yaml);
    const config = runVisualConfig(yaml, [
      {
        workbuddyTasks: withTask(loaded.visualValues.workbuddyTasks, 'checkin', { interval: '2h' }),
      },
    ]);
    const output = parseYaml(config.applyVisualChangesToYaml(yaml)) as {
      workbuddy: { tasks: Record<string, Record<string, unknown>> };
      server: { port: number };
    };
    expect(output.workbuddy.tasks.checkin).toEqual({ future: 'keep', interval: '2h' });
    expect(output.workbuddy.tasks['unknown-task']).toEqual({ interval: '1h' });
    expect(Object.keys(output.workbuddy.tasks)).toEqual(['unknown-task', 'checkin']);
    expect(output.server.port).toBe(9000);
  });

  test('tri-state enabled: default deletes the key, explicit values write booleans', () => {
    const enabledYaml = `workbuddy:
  tasks:
    checkin:
      enabled: true
      interval: 24h
`;
    const enabledConfig = runVisualConfig(enabledYaml);
    const cleared = runVisualConfig(enabledYaml, [
      {
        workbuddyTasks: withTask(enabledConfig.visualValues.workbuddyTasks, 'checkin', {
          enabled: 'default',
        }),
      },
    ]);
    expect(
      (
        parseYaml(cleared.applyVisualChangesToYaml(enabledYaml)) as {
          workbuddy: { tasks: Record<string, Record<string, unknown>> };
        }
      ).workbuddy.tasks.checkin
    ).toEqual({ interval: '24h' });

    const baseYaml = `workbuddy:
  tasks:
    checkin:
      interval: 24h
`;
    const baseConfig = runVisualConfig(baseYaml);
    const disabled = runVisualConfig(baseYaml, [
      {
        workbuddyTasks: withTask(baseConfig.visualValues.workbuddyTasks, 'checkin', {
          enabled: 'disabled',
        }),
      },
    ]);
    expect(
      (
        parseYaml(disabled.applyVisualChangesToYaml(baseYaml)) as {
          workbuddy: { tasks: Record<string, Record<string, unknown>> };
        }
      ).workbuddy.tasks.checkin
    ).toEqual({ interval: '24h', enabled: false });

    const reenabled = runVisualConfig(baseYaml, [
      {
        workbuddyTasks: withTask(baseConfig.visualValues.workbuddyTasks, 'checkin', {
          enabled: 'enabled',
        }),
      },
    ]);
    expect(
      (
        parseYaml(reenabled.applyVisualChangesToYaml(baseYaml)) as {
          workbuddy: { tasks: Record<string, Record<string, unknown>> };
        }
      ).workbuddy.tasks.checkin
    ).toEqual({ interval: '24h', enabled: true });
  });

  test('clearing tasks and workers prunes empty workbuddy maps but keeps unrelated YAML', () => {
    const yaml = `workbuddy:
  workers: 4
  tasks:
    checkin:
      enabled: true
      interval: 24h
server:
  port: 9000
`;
    const loaded = runVisualConfig(yaml);
    const config = runVisualConfig(yaml, [
      {
        workbuddyWorkers: '',
        workbuddyTasks: defaultWorkBuddyTasks(),
      },
    ]);
    expect(loaded.visualValues.workbuddyWorkers).toBe('4');
    const output = parseYaml(config.applyVisualChangesToYaml(yaml)) as Record<string, unknown>;
    expect(output.workbuddy).toBeUndefined();
    expect(output.server).toEqual({ port: 9000 });
  });

  test('dirty tracking follows task structure and ignores unrelated edits', () => {
    const loaded = runVisualConfig('{}');
    const changed = withTask(loaded.visualValues.workbuddyTasks, 'checkin', { interval: '1h' });
    const reverted = runVisualConfig('{}', [
      { workbuddyTasks: changed },
      { workbuddyTasks: loaded.visualValues.workbuddyTasks },
    ]);
    expect(reverted.visualDirtyFields.has('workbuddyTasks')).toBe(false);

    const unrelated = runVisualConfig('{}', [{ debug: true }]);
    expect(unrelated.visualDirtyFields.has('workbuddyTasks')).toBe(false);
  });

  test('validates workers, durations, timezones, and per-task schedules', () => {
    expect(errors({ workbuddyWorkers: '65' }).workbuddyWorkers).toBe('integer_range_0_64');
    expect(errors({ workbuddyWorkers: '0' }).workbuddyWorkers).toBeUndefined();
    expect(errors({ workbuddyWorkers: '64' }).workbuddyWorkers).toBeUndefined();
    expect(errors({ workbuddyRequestTimeout: '1d' }).workbuddyRequestTimeout).toBe(
      'invalid_duration'
    );
    expect(errors({ workbuddyTimezone: 'Mars/Base' }).workbuddyTimezone).toBe('invalid_timezone');
    expect(errors({ workbuddyTimezone: 'Local' }).workbuddyTimezone).toBeUndefined();

    const badSchedule = defaultWorkBuddyTasks();
    badSchedule[0] = task('checkin', { dailyAt: '25:00' });
    expect(errors({ workbuddyTasks: badSchedule }).workbuddyTasks).toBe('invalid_workbuddy_tasks');
    expect(getWorkBuddyTaskFieldError(task('checkin', { dailyAt: '25:00' }), 'dailyAt')).toBe(
      'invalid_daily_at'
    );
    expect(getWorkBuddyTaskFieldError(task('checkin', { interval: '1d' }), 'interval')).toBe(
      'invalid_duration'
    );
  });

  test('buildConfigPatch on an unrelated edit does not touch workbuddy', () => {
    const before = `server:
  port: 9000
workbuddy:
  workers: 4
`;
    const config = runVisualConfig(before, [{ debug: true }]);
    const after = config.applyVisualChangesToYaml(before);
    const plan = buildConfigPatch(before, after);
    expect(plan.patch).not.toHaveProperty('workbuddy');
    expect(plan.deletions).toEqual([]);
  });
});
