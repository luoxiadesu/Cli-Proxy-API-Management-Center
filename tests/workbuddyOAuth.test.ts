import { describe, expect, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import en from '@/i18n/locales/en.json';
import { OAuthFlowDialog } from '@/features/oauth/components/OAuthFlowDialog';
import {
  CALLBACK_SUPPORTED,
  OAUTH_PROVIDERS,
  supportsManualCallback,
} from '@/features/oauth/providers';
import { apiClient } from '@/services/api/client';
import { oauthApi, type BuiltInOAuthProvider } from '@/services/api/oauth';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ru', 'vi', 'ko'] as const;

const WORKBUDDY_LOGIN_KEYS = [
  'oauth_title',
  'oauth_button',
  'oauth_hint',
  'open_link',
  'copy_link',
  'oauth_status_waiting',
  'oauth_status_success',
  'oauth_status_error',
  'oauth_start_error',
  'oauth_polling_error',
] as const;

describe('WorkBuddy device OAuth', () => {
  test('uses the backend workbuddy device endpoint without is_webui', async () => {
    const provider: BuiltInOAuthProvider = 'workbuddy';
    const response = {
      status: 'ok',
      url: 'https://example.test/auth',
      state: 'wb-1',
      flow: 'device',
      expires_in: 600,
    };
    const signal = new AbortController().signal;
    const get = spyOn(apiClient, 'get').mockResolvedValue(response);
    try {
      expect(await oauthApi.startAuth(provider, signal)).toEqual(response);
      expect(get).toHaveBeenLastCalledWith('/oauth/auth-url', {
        params: { provider: 'workbuddy' },
        signal,
      });
      await oauthApi.startAuth('WorkBuddy');
      expect(get).toHaveBeenLastCalledWith('/oauth/auth-url', {
        params: { provider: 'workbuddy' },
      });
    } finally {
      get.mockRestore();
    }
  });

  test('registers a device-code card without a manual OAuth callback', () => {
    const card = OAUTH_PROVIDERS.find((provider) => provider.id === 'workbuddy');
    expect(card).toMatchObject({ flow: 'device', label: 'WorkBuddy' });
    expect(CALLBACK_SUPPORTED.has('workbuddy')).toBe(false);
    expect(card && supportsManualCallback(card)).toBe(false);
  });

  test('renders the open-link step only when the device response has no user code', () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(OAuthFlowDialog, {
          open: true,
          providerId: 'workbuddy',
          heading: {
            title: en.auth_login.workbuddy_oauth_title,
            caption: 'Device code',
            icon: '',
          },
          state: { status: 'waiting', url: 'https://example.test/auth', state: 'wb-1' },
          text: (suffix: string) => i18n.t(`auth_login.workbuddy_${suffix}`),
          supportsCallback: false,
          onStart: () => {},
          onCancel: () => {},
          onCallbackChange: () => {},
          onCallbackSubmit: () => {},
          onViewAuthFiles: () => {},
          onClose: () => {},
        })
      )
    );
    expect(markup).toContain(en.auth_login.step_open_auth_page);
    expect(markup).toContain(en.auth_login.workbuddy_open_link);
    expect(markup).not.toContain(en.auth_login.step_enter_device_code);
    expect(markup).not.toContain(en.auth_login.oauth_callback_label);
    expect(markup).not.toContain('auth_login.');
  });

  test('provides every login key and the auth-file filter in all locales', () => {
    for (const locale of LOCALES) {
      const translations = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8')) as {
        auth_login: Record<string, string>;
        auth_files: Record<string, string>;
      };
      for (const suffix of WORKBUDDY_LOGIN_KEYS) {
        expect(translations.auth_login[`workbuddy_${suffix}`]).toBeTruthy();
      }
      expect(translations.auth_files.filter_workbuddy).toBe('WorkBuddy');
    }
  });
});
