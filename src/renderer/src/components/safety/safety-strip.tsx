import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PiShieldWarning } from 'react-icons/pi';

/** The brand CI's disclaimer, in Thai for the clinic staff whatever the UI language is */
const THAI_NOTICE = 'ระบบต้นแบบเพื่อการสื่อสารเบื้องต้น ห้ามใช้ทดแทนการวินิจฉัยทางการแพทย์';

/**
 * Always-visible safety strip at the bottom of the app. Part of the product's safety
 * behaviour: the interpreter must not replace a human interpreter for medical decisions.
 */
function SafetyStrip(): JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <footer className="yd-safety" role="note">
      <PiShieldWarning aria-hidden />
      {/* One paragraph, so both languages wrap as a single flowing line */}
      <p>
        <span lang="th">{THAI_NOTICE}</span>
        {!i18n.language.startsWith('th') && (
          <span className="yd-safety__en"> · {t('safety.notice')}</span>
        )}
      </p>
    </footer>
  );
}

export default memo(SafetyStrip);
