import { memo } from 'react';
import { Menu } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  PiGearSix, PiClockCounterClockwise, PiNotePencil, PiUsersThree, PiStack,
} from 'react-icons/pi';
import { useWebSocket } from '@/context/websocket-context';
import { useConfig } from '@/context/character-config-context';
import { useSidebar } from '@/hooks/sidebar/use-sidebar';
import SettingUI from '@/components/sidebar/setting/setting-ui';
import HistoryDrawer from '@/components/sidebar/history-drawer';
import GroupDrawer from '@/components/sidebar/group-drawer';
import markLight from '@/assets/brand/logo-mark-light.png';
import markDark from '@/assets/brand/logo-mark-dark.png';
import wordLight from '@/assets/brand/logo-word-light.png';
import wordDark from '@/assets/brand/logo-word-dark.png';

/** The server connection, as the status pill shows it */
function StatusPill(): JSX.Element {
  const { t } = useTranslation();
  const { wsState, reconnect } = useWebSocket();

  if (wsState === 'OPEN') {
    return (
      <span className="yd-status" data-state="ready" role="status">
        <span className="yd-status__dot" aria-hidden="true" />
        {t('wsStatus.ready')}
      </span>
    );
  }
  if (wsState === 'CONNECTING') {
    return (
      <span className="yd-status" data-state="connecting" role="status">
        <span className="yd-status__dot" aria-hidden="true" />
        {t('wsStatus.connecting')}
      </span>
    );
  }
  return (
    <button type="button" className="yd-status" data-state="offline" onClick={reconnect}>
      <span className="yd-status__dot" aria-hidden="true" />
      {t('wsStatus.offline')}
    </button>
  );
}

/** Top bar: logo, connection status, the active character, and the app's actions */
function AppHeader(): JSX.Element {
  const { t, i18n } = useTranslation();
  const nextLanguage = i18n.resolvedLanguage === 'en' ? 'th' : 'en';
  const { confName } = useConfig();
  const {
    settingsOpen, onSettingsOpen, onSettingsClose, createNewHistory, setMode, currentMode, isElectron,
  } = useSidebar();

  return (
    <header className="yd-header">
      <div className="yd-brand" role="img" aria-label="yawidoc">
        <img className="yd-brand__mark yd-only-light" src={markLight} alt="" />
        <img className="yd-brand__mark yd-only-dark" src={markDark} alt="" />
        <img className="yd-brand__word yd-only-light" src={wordLight} alt="" />
        <img className="yd-brand__word yd-only-dark" src={wordDark} alt="" />
      </div>

      <StatusPill />
      {confName && <span className="yd-character" title={confName}>{confName}</span>}

      <nav className="yd-header__actions" aria-label={t('common.settings')}>
        <GroupDrawer>
          <button type="button" className="yd-icon-btn yd-desktop-only" aria-label={t('header.group')} title={t('header.group')}>
            <PiUsersThree aria-hidden />
          </button>
        </GroupDrawer>

        {isElectron && (
          <Menu.Root>
            <Menu.Trigger asChild>
              <button type="button" className="yd-icon-btn yd-desktop-only" aria-label={t('header.mode')} title={t('header.mode')}>
                <PiStack aria-hidden />
              </button>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.RadioItemGroup value={currentMode}>
                  <Menu.RadioItem value="window" onClick={() => setMode('window')}>
                    <Menu.ItemIndicator />
                    Live Mode
                  </Menu.RadioItem>
                  <Menu.RadioItem value="pet" onClick={() => setMode('pet')}>
                    <Menu.ItemIndicator />
                    Pet Mode
                  </Menu.RadioItem>
                </Menu.RadioItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        )}

        <HistoryDrawer>
          <button type="button" className="yd-icon-btn" aria-label={t('header.history')} title={t('header.history')}>
            <PiClockCounterClockwise aria-hidden />
          </button>
        </HistoryDrawer>

        <button
          type="button"
          className="yd-icon-btn"
          aria-label={t('header.newConversation')}
          title={t('header.newConversation')}
          onClick={createNewHistory}
        >
          <PiNotePencil aria-hidden />
        </button>

        {/* Thai / English: the button names the language it switches to */}
        <button
          type="button"
          className="yd-icon-btn yd-lang-btn"
          lang={nextLanguage}
          aria-label={t('header.switchLanguage')}
          title={t('header.switchLanguage')}
          onClick={() => i18n.changeLanguage(nextLanguage)}
        >
          {t('header.switchLanguageShort')}
        </button>

        <button
          type="button"
          className="yd-icon-btn"
          aria-label={t('header.settings')}
          title={t('header.settings')}
          onClick={onSettingsOpen}
        >
          <PiGearSix aria-hidden />
        </button>
      </nav>

      {settingsOpen && <SettingUI open={settingsOpen} onClose={onSettingsClose} onToggle={onSettingsClose} />}
    </header>
  );
}

export default memo(AppHeader);
