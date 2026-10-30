import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuthFileIcon } from '@/features/authFiles/constants';
import { useThemeStore } from '@/stores';
import { formatDateTimeValue } from '@/utils/format';
import type { ResolvedTheme } from '@/types';
import { buildTaskRows, primitiveDataEntries, taskStatusTone } from '../logic';
import type {
  WorkBuddyAccountView,
  WorkBuddyTaskSpecView,
  WorkBuddyTaskStatusView,
  WorkBuddyTaskTone,
} from '../types';
import styles from './WorkBuddyAccountCard.module.scss';

const TONE_CLASS: Record<WorkBuddyTaskTone, string> = {
  ok: styles.toneOk,
  error: styles.toneError,
  never: styles.toneNever,
};

const STATUS_KEY: Record<WorkBuddyTaskTone, string> = {
  ok: 'workbuddy_tasks.status_ok',
  error: 'workbuddy_tasks.status_error',
  never: 'workbuddy_tasks.status_never',
};

function formatInstant(value: string | undefined, locale: string, fallback: string): string {
  if (!value) return fallback;
  return formatDateTimeValue(value, locale) || fallback;
}

function TaskDetails({ state, noneLabel }: { state?: WorkBuddyTaskStatusView; noneLabel: string }) {
  const { t } = useTranslation();
  const entries = primitiveDataEntries(state?.data);
  const hasError = Boolean(state?.lastError);
  const hasWindow = Boolean(state?.lastWindow);

  if (!hasError && !hasWindow && entries.length === 0) {
    return <span className={styles.muted}>{noneLabel}</span>;
  }

  return (
    <div className={styles.details}>
      {hasWindow ? <span className={styles.window}>{state?.lastWindow}</span> : null}
      {hasError ? (
        <span className={styles.errorText} title={state?.lastError}>
          {state?.lastError}
        </span>
      ) : null}
      {entries.length > 0 ? (
        <details className={styles.dataDetails}>
          <summary className={styles.dataSummary}>{t('workbuddy_tasks.details_data')}</summary>
          <dl className={styles.dataList}>
            {entries.map(([key, value]) => (
              <div key={key} className={styles.dataRow}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}

function ScheduleCell({ spec, noneLabel }: { spec?: WorkBuddyTaskSpecView; noneLabel: string }) {
  const { t } = useTranslation();
  if (!spec) return <span className={styles.muted}>{noneLabel}</span>;

  const schedule = spec.dailyAt
    ? t('workbuddy_tasks.schedule_daily', { time: spec.dailyAt })
    : spec.interval
      ? t('workbuddy_tasks.schedule_interval', { interval: spec.interval })
      : noneLabel;

  return (
    <span className={styles.schedule}>
      <span>{schedule}</span>
      {!spec.enabled ? (
        <span className={styles.scheduleOff}>{t('workbuddy_tasks.schedule_disabled')}</span>
      ) : null}
    </span>
  );
}

export function WorkBuddyAccountCard({
  account,
  specs,
}: {
  account: WorkBuddyAccountView;
  specs: WorkBuddyTaskSpecView[];
}) {
  const { t, i18n } = useTranslation();
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const iconSrc = getAuthFileIcon('workbuddy', resolvedTheme);
  const rows = buildTaskRows(account);
  const specByName = useMemo(() => new Map(specs.map((spec) => [spec.name, spec])), [specs]);
  const locale = i18n.language;
  const noneLabel = t('workbuddy_tasks.none');
  const updated = formatDateTimeValue(account.updatedAt, locale);

  return (
    <article className={styles.card} aria-label={account.label || account.authId}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {iconSrc ? <img src={iconSrc} alt="" /> : <span>{account.label.charAt(0)}</span>}
          </span>
          <div className={styles.identityText}>
            <h2 className={styles.name}>{account.label || account.authId}</h2>
            <p className={styles.identifiers}>
              {account.uid ? <span className={styles.uid}>{account.uid}</span> : null}
              {account.uid && account.authId ? (
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span className={styles.authId}>{account.authId}</span>
            </p>
          </div>
        </div>
        <div className={styles.badges}>
          {account.disabled ? (
            <span className={`${styles.badge} ${styles.badgeMuted}`}>
              {t('workbuddy_tasks.account_disabled')}
            </span>
          ) : null}
          {account.orphan ? (
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              {t('workbuddy_tasks.account_orphan')}
            </span>
          ) : null}
        </div>
      </header>

      {updated ? (
        <p className={styles.updated}>{t('workbuddy_tasks.account_updated', { time: updated })}</p>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table} aria-label={t('workbuddy_tasks.tasks_heading')}>
          <caption className={styles.caption}>{t('workbuddy_tasks.table_caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('workbuddy_tasks.col_task')}</th>
              <th scope="col">{t('workbuddy_tasks.col_schedule')}</th>
              <th scope="col">{t('workbuddy_tasks.col_status')}</th>
              <th scope="col">{t('workbuddy_tasks.col_last_run')}</th>
              <th scope="col">{t('workbuddy_tasks.col_next_retry')}</th>
              <th scope="col">{t('workbuddy_tasks.col_failures')}</th>
              <th scope="col">{t('workbuddy_tasks.col_details')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = taskStatusTone(row.state);
              const failures = row.state?.consecutiveFailures ?? 0;
              return (
                <tr key={row.name}>
                  <th scope="row" className={styles.taskName}>
                    {t(`workbuddy.taskNames.${row.name}`, { defaultValue: row.name })}
                  </th>
                  <td className={styles.scheduleCell}>
                    <ScheduleCell spec={specByName.get(row.name)} noneLabel={noneLabel} />
                  </td>
                  <td>
                    <span className={`${styles.status} ${TONE_CLASS[tone]}`}>
                      {t(STATUS_KEY[tone])}
                    </span>
                  </td>
                  <td className={styles.instant}>
                    {formatInstant(row.state?.lastRun, locale, noneLabel)}
                  </td>
                  <td className={styles.instant}>
                    {formatInstant(row.state?.nextRetry, locale, noneLabel)}
                  </td>
                  <td className={styles.failures}>
                    {failures > 0 ? t('workbuddy_tasks.failures', { count: failures }) : noneLabel}
                  </td>
                  <td className={styles.detailsCell}>
                    <TaskDetails state={row.state} noneLabel={noneLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
