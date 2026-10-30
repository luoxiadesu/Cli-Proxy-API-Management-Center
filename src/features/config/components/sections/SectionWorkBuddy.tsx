import { useTranslation } from 'react-i18next';
import { CONFIG_TAB_ICONS, SECTION_INDEX_LABELS } from '../../constants';
import type { ConfigSectionProps } from '../../types';
import { SectionCard } from '../SectionCard';
import {
  BlockSetting,
  FieldStack,
  SettingList,
  TextSetting,
  ToggleSetting,
} from '../fields/FieldPrimitives';
import { WorkBuddyTaskEditor } from '../blocks/WorkBuddyTaskEditor';
import { getValidationMessage } from '../blocks/shared';

const Icon = CONFIG_TAB_ICONS.workbuddy;

/** 07 WorkBuddy：scheduled-task scheduler switches and per-task overrides. */
export function SectionWorkBuddy({
  values,
  validationErrors,
  disabled,
  animateIn,
  onChange,
}: ConfigSectionProps) {
  const { t } = useTranslation();
  const tasksError = getValidationMessage(t, validationErrors?.workbuddyTasks);

  return (
    <SectionCard
      indexLabel={SECTION_INDEX_LABELS.workbuddy}
      icon={<Icon size={16} />}
      title={t('config_management.visual.sections.workbuddy.title')}
      description={t('config_management.visual.sections.workbuddy.description')}
      animateIn={animateIn}
    >
      <FieldStack>
        <SettingList>
          <ToggleSetting
            fieldId="workbuddyEnabled"
            wide
            label={t('config_management.visual.workbuddy.enabled_label')}
            description={t('config_management.visual.workbuddy.enabled_hint')}
            checked={values.workbuddyEnabled}
            disabled={disabled}
            onChange={(workbuddyEnabled) => onChange({ workbuddyEnabled })}
          />
          <TextSetting
            fieldId="workbuddyWorkers"
            type="number"
            min={0}
            max={64}
            size="sm"
            label={t('config_management.visual.workbuddy.workers_label')}
            description={t('config_management.visual.workbuddy.workers_hint')}
            value={values.workbuddyWorkers}
            disabled={disabled}
            error={getValidationMessage(t, validationErrors?.workbuddyWorkers)}
            onChange={(workbuddyWorkers) => onChange({ workbuddyWorkers })}
          />
          <TextSetting
            fieldId="workbuddyStateDir"
            size="lg"
            label={t('config_management.visual.workbuddy.state_dir_label')}
            description={t('config_management.visual.workbuddy.state_dir_hint')}
            value={values.workbuddyStateDir}
            disabled={disabled}
            onChange={(workbuddyStateDir) => onChange({ workbuddyStateDir })}
          />
          <TextSetting
            fieldId="workbuddyRequestTimeout"
            size="sm"
            placeholder="30s"
            label={t('config_management.visual.workbuddy.request_timeout_label')}
            description={t('config_management.visual.workbuddy.request_timeout_hint')}
            value={values.workbuddyRequestTimeout}
            disabled={disabled}
            error={getValidationMessage(t, validationErrors?.workbuddyRequestTimeout)}
            onChange={(workbuddyRequestTimeout) => onChange({ workbuddyRequestTimeout })}
          />
          <TextSetting
            fieldId="workbuddyTimezone"
            size="md"
            placeholder="Asia/Shanghai"
            label={t('config_management.visual.workbuddy.timezone_label')}
            description={t('config_management.visual.workbuddy.timezone_hint')}
            value={values.workbuddyTimezone}
            disabled={disabled}
            error={getValidationMessage(t, validationErrors?.workbuddyTimezone)}
            onChange={(workbuddyTimezone) => onChange({ workbuddyTimezone })}
          />
          <BlockSetting
            fieldId="workbuddyTasks"
            label={t('config_management.visual.workbuddy.tasks_label')}
            description={t('config_management.visual.workbuddy.tasks_hint')}
            error={tasksError}
          >
            <WorkBuddyTaskEditor
              tasks={values.workbuddyTasks}
              disabled={disabled}
              error={tasksError}
              onChange={(workbuddyTasks) => onChange({ workbuddyTasks })}
            />
          </BlockSetting>
        </SettingList>
      </FieldStack>
    </SectionCard>
  );
}
