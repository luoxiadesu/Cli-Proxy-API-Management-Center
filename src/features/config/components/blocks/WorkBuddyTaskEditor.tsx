import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, type SelectOption } from '@/components/ui/Select';
import type {
  WorkBuddyTaskDraft,
  WorkBuddyTaskEnabled,
  WorkBuddyTaskName,
} from '@/types/workBuddy';
import { getWorkBuddyTaskFieldError } from '../../visualConfigWorkBuddy';
import { getValidationMessage } from './shared';
import styles from './WorkBuddyTaskEditor.module.scss';

type TaskField = 'interval' | 'dailyAt' | 'timeout';

const PLACEHOLDER_KEYS: Record<TaskField, string> = {
  interval: 'config_management.visual.workbuddy.placeholder_interval',
  dailyAt: 'config_management.visual.workbuddy.placeholder_daily_at',
  timeout: 'config_management.visual.workbuddy.placeholder_timeout',
};

const COLUMN_KEYS: Record<TaskField, string> = {
  interval: 'config_management.visual.workbuddy.table_interval',
  dailyAt: 'config_management.visual.workbuddy.table_daily_at',
  timeout: 'config_management.visual.workbuddy.table_timeout',
};

/**
 * Fixed ten-task editor. The outer BlockSetting renders the group title, hint, and
 * block-level error; per-row errors are surfaced inline below each input.
 */
export function WorkBuddyTaskEditor({
  tasks,
  disabled,
  error,
  onChange,
}: {
  tasks: WorkBuddyTaskDraft[];
  disabled?: boolean;
  error?: string;
  onChange: (tasks: WorkBuddyTaskDraft[]) => void;
}) {
  const { t } = useTranslation();
  const baseId = useId();

  const enabledOptions: SelectOption[] = [
    { value: 'default', label: t('config_management.visual.workbuddy.enabled_default') },
    { value: 'enabled', label: t('config_management.visual.workbuddy.enabled_on') },
    { value: 'disabled', label: t('config_management.visual.workbuddy.enabled_off') },
  ];

  const taskLabel = (name: WorkBuddyTaskName) => t(`workbuddy.taskNames.${name}`);

  const updateTask = (name: WorkBuddyTaskName, patch: Partial<WorkBuddyTaskDraft>) => {
    onChange(tasks.map((task) => (task.name === name ? { ...task, ...patch } : task)));
  };

  const renderInput = (task: WorkBuddyTaskDraft, field: TaskField) => {
    const errorCode = getWorkBuddyTaskFieldError(task, field);
    const message = getValidationMessage(t, errorCode);
    const inputId = `${baseId}-${task.name}-${field}`;
    const errorId = `${inputId}-error`;
    return (
      <div key={field} className={styles.cell}>
        <input
          id={inputId}
          className="input"
          type="text"
          value={task[field]}
          placeholder={t(PLACEHOLDER_KEYS[field])}
          disabled={disabled}
          spellCheck={false}
          aria-label={`${taskLabel(task.name)} ${t(COLUMN_KEYS[field])}`}
          aria-invalid={errorCode ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          onChange={(event) => updateTask(task.name, { [field]: event.target.value })}
        />
        {message ? (
          <span id={errorId} className={styles.cellError}>
            {message}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={styles.table}
      role="group"
      aria-label={t('config_management.visual.workbuddy.tasks_label')}
      aria-invalid={error ? true : undefined}
    >
      <div className={`${styles.headerRow}`} aria-hidden="true">
        <span>{t('config_management.visual.workbuddy.table_task')}</span>
        <span>{t('config_management.visual.workbuddy.table_enabled')}</span>
        <span>{t('config_management.visual.workbuddy.table_interval')}</span>
        <span>{t('config_management.visual.workbuddy.table_daily_at')}</span>
        <span>{t('config_management.visual.workbuddy.table_timeout')}</span>
      </div>
      {tasks.map((task) => (
        <div key={task.name} className={styles.row}>
          <span className={styles.taskName}>{taskLabel(task.name)}</span>
          <div className={styles.cell}>
            <Select
              value={task.enabled}
              options={enabledOptions}
              disabled={disabled}
              size="sm"
              ariaLabel={`${taskLabel(task.name)} ${t(
                'config_management.visual.workbuddy.table_enabled'
              )}`}
              onChange={(value) =>
                updateTask(task.name, { enabled: value as WorkBuddyTaskEnabled })
              }
            />
          </div>
          {renderInput(task, 'interval')}
          {renderInput(task, 'dailyAt')}
          {renderInput(task, 'timeout')}
        </div>
      ))}
    </div>
  );
}
