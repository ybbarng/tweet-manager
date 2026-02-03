import { beforeEach, describe, expect, it } from 'vitest';
import {
  isManualLogout,
  isWarningDismissed,
  resetWarningDismissed,
  setManualLogout,
} from '../AuthForm';

describe('AuthForm 헬퍼 함수', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setManualLogout / isManualLogout', () => {
    it('기본값은 false이다', () => {
      expect(isManualLogout()).toBe(false);
    });

    it('setManualLogout(true)로 설정하면 isManualLogout()이 true를 반환한다', () => {
      setManualLogout(true);
      expect(isManualLogout()).toBe(true);
    });

    it('setManualLogout(false)로 설정하면 isManualLogout()이 false를 반환한다', () => {
      setManualLogout(true);
      expect(isManualLogout()).toBe(true);

      setManualLogout(false);
      expect(isManualLogout()).toBe(false);
    });

    it('localStorage에 올바른 키로 저장된다', () => {
      setManualLogout(true);
      expect(localStorage.getItem('tweet-manager-manual-logout')).toBe('true');

      setManualLogout(false);
      expect(localStorage.getItem('tweet-manager-manual-logout')).toBeNull();
    });
  });

  describe('isWarningDismissed / resetWarningDismissed', () => {
    it('기본값은 false이다', () => {
      expect(isWarningDismissed()).toBe(false);
    });

    it('localStorage에 값이 있으면 true를 반환한다', () => {
      localStorage.setItem('tweet-manager-warning-dismissed', 'true');
      expect(isWarningDismissed()).toBe(true);
    });

    it('resetWarningDismissed()로 초기화하면 false를 반환한다', () => {
      localStorage.setItem('tweet-manager-warning-dismissed', 'true');
      expect(isWarningDismissed()).toBe(true);

      resetWarningDismissed();
      expect(isWarningDismissed()).toBe(false);
    });
  });
});
