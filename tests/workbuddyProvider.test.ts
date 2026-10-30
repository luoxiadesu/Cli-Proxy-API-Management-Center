import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  getAuthFileIcon,
  OAUTH_PROVIDER_PRESETS,
  supportsAuthFileManualRefresh,
} from '@/features/authFiles/constants';
import { providerLabel } from '@/features/dashboard/utils';
import type { AuthFileType } from '@/types/authFile';
import { TYPE_COLORS } from '@/utils/quota/constants';

const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ru', 'vi', 'ko'] as const;

describe('WorkBuddy provider recognition', () => {
  test('registers the auth-file preset and enables manual refresh', () => {
    const type: AuthFileType = 'workbuddy';
    expect(type).toBe('workbuddy');
    expect(OAUTH_PROVIDER_PRESETS).toContain('workbuddy');
    expect(supportsAuthFileManualRefresh('workbuddy')).toBe(true);
  });

  test('provides an icon for both themes plus quota colors', () => {
    expect(getAuthFileIcon('workbuddy', 'light')).toBeTruthy();
    expect(getAuthFileIcon('workbuddy', 'dark')).toBeTruthy();
    expect(TYPE_COLORS.workbuddy.light).toBeDefined();
    expect(TYPE_COLORS.workbuddy.dark).toBeDefined();
    expect(providerLabel('workbuddy', 'Unknown')).toBe('WorkBuddy');
  });

  test('provides the auth-file filter label in all locales', () => {
    for (const locale of LOCALES) {
      const translations = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8')) as {
        auth_files: Record<string, string>;
      };
      expect(translations.auth_files.filter_workbuddy).toBe('WorkBuddy');
    }
  });
});
