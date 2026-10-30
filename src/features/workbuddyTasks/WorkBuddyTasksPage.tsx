import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconRefreshCw } from '@/components/ui/icons';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { workbuddyTasksApi } from '@/services/api';
import { useAuthStore } from '@/stores';
import { formatDateTimeValue } from '@/utils/format';
import { WorkBuddyAccountCard } from './components/WorkBuddyAccountCard';
import { countTaskFailures, sortAccounts } from './logic';
import type { WorkBuddyTasksView } from './types';
import styles from './WorkBuddyTasksPage.module.scss';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

const SKELETON_COUNT = 2;

export function WorkBuddyTasksPage() {
  const { t, i18n } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const connected = connectionStatus === 'connected';

  const [data, setData] = useState<WorkBuddyTasksView | null>(null);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();

    if (!connected) {
      requestRef.current += 1;
      setData(null);
      setStatus('idle');
      return;
    }

    const requestId = ++requestRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setErrorMessage('');

    try {
      const view = await workbuddyTasksApi.list(controller.signal);
      if (requestId !== requestRef.current) return;
      setData(view);
      setStatus('ready');
    } catch (error) {
      if (controller.signal.aborted || requestId !== requestRef.current) return;
      const statusCode = (error as { status?: number } | null)?.status;
      setData(null);
      if (statusCode === 404) {
        setStatus('unsupported');
      } else {
        setErrorMessage(error instanceof Error ? error.message : '');
        setStatus('error');
      }
    }
  }, [connected]);

  useEffect(() => {
    void load();
    return () => {
      requestRef.current += 1;
      abortRef.current?.abort();
    };
  }, [load]);

  useHeaderRefresh(load, connected);

  const accounts = useMemo(() => (data ? sortAccounts(data.accounts) : []), [data]);
  const failureCount = useMemo(() => countTaskFailures(accounts), [accounts]);
  const observedAt = data ? formatDateTimeValue(data.observedAt, i18n.language) : '';

  const refreshing = status === 'loading';
  const showSkeleton = connected && (status === 'idle' || status === 'loading');
  const showReady = status === 'ready' && Boolean(data);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.copy}>
          <h1 className={styles.title}>{t('workbuddy_tasks.title')}</h1>
          <p className={styles.description}>{t('workbuddy_tasks.description')}</p>
          {showReady && data ? (
            <p className={styles.meta}>
              <span>{t('workbuddy_tasks.meta_accounts', { count: accounts.length })}</span>
              <span className={styles.metaDot} aria-hidden="true">
                ·
              </span>
              <span className={failureCount > 0 ? styles.metaError : styles.metaMuted}>
                {t('workbuddy_tasks.meta_errors', { count: failureCount })}
              </span>
              {observedAt ? (
                <>
                  <span className={styles.metaDot} aria-hidden="true">
                    ·
                  </span>
                  <span>{t('workbuddy_tasks.observed_at', { time: observedAt })}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            disabled={!connected || refreshing}
            loading={refreshing}
          >
            <IconRefreshCw size={16} />
            {t('workbuddy_tasks.refresh')}
          </Button>
        </div>
      </header>

      {!connected ? (
        <EmptyState
          title={t('workbuddy_tasks.disconnected_title')}
          description={t('workbuddy_tasks.disconnected_description')}
        />
      ) : status === 'unsupported' ? (
        <EmptyState
          title={t('workbuddy_tasks.unsupported_title')}
          description={t('workbuddy_tasks.unsupported_description')}
        />
      ) : status === 'error' ? (
        <EmptyState
          title={t('workbuddy_tasks.load_failed')}
          description={errorMessage}
          action={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              <IconRefreshCw size={16} />
              {t('workbuddy_tasks.retry')}
            </Button>
          }
        />
      ) : showSkeleton ? (
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <Skeleton width="38%" height={18} />
              <Skeleton width="64%" height={14} />
              <Skeleton width="100%" height={180} />
            </div>
          ))}
        </div>
      ) : showReady && data ? (
        <>
          {!data.enabled ? (
            <p className={styles.notice} role="status">
              {t('workbuddy_tasks.disabled_notice')}
            </p>
          ) : null}
          {data.homeEnabled ? (
            <p className={styles.notice} role="status">
              {t('workbuddy_tasks.home_notice')}
            </p>
          ) : null}
          {accounts.length === 0 ? (
            <EmptyState
              title={t('workbuddy_tasks.empty_title')}
              description={t('workbuddy_tasks.empty_description')}
              action={
                <Link to="/oauth" className="btn btn-secondary btn-sm">
                  {t('workbuddy_tasks.empty_action')}
                </Link>
              }
            />
          ) : (
            <div className={styles.grid}>
              {accounts.map((account) => (
                <WorkBuddyAccountCard key={account.authId} account={account} specs={data.tasks} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
