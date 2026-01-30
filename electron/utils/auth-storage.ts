import * as fs from 'node:fs';
import * as path from 'node:path';
import { app, safeStorage } from 'electron';
import { logger } from './logger';

interface StoredCredentials {
  auth: {
    authToken: string;
    csrfToken: string;
    bearerToken: string;
  };
  user: {
    id: string;
    name: string;
    screenName: string;
    profileImageUrl: string;
  };
}

function getCredentialsPath(): string {
  return path.join(app.getPath('userData'), 'credentials.dat');
}

/**
 * 인증 정보를 암호화하여 저장
 */
export function saveCredentials(data: StoredCredentials): void {
  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn('[auth-storage] 암호화를 사용할 수 없어 저장을 건너뜁니다.');
    return;
  }

  try {
    const json = JSON.stringify(data);
    const encrypted = safeStorage.encryptString(json);
    fs.writeFileSync(getCredentialsPath(), encrypted);
    logger.log('[auth-storage] 인증 정보 저장 완료');
  } catch (error) {
    logger.error('[auth-storage] 인증 정보 저장 실패:', error);
    throw error;
  }
}

/**
 * 저장된 인증 정보 로드
 */
export function loadCredentials(): StoredCredentials | null {
  const filePath = getCredentialsPath();

  if (!fs.existsSync(filePath)) {
    logger.log('[auth-storage] 저장된 인증 정보 없음');
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn('[auth-storage] 암호화를 사용할 수 없어 로드를 건너뜁니다.');
    return null;
  }

  try {
    const encrypted = fs.readFileSync(filePath);
    const json = safeStorage.decryptString(encrypted);
    const data = JSON.parse(json) as StoredCredentials;
    logger.log('[auth-storage] 인증 정보 로드 완료');
    return data;
  } catch (error) {
    logger.error('[auth-storage] 인증 정보 로드 실패:', error);
    return null;
  }
}

/**
 * 저장된 인증 정보 삭제
 */
export function clearCredentials(): void {
  const filePath = getCredentialsPath();

  if (!fs.existsSync(filePath)) {
    logger.log('[auth-storage] 삭제할 인증 정보 없음');
    return;
  }

  try {
    fs.unlinkSync(filePath);
    logger.log('[auth-storage] 인증 정보 삭제 완료');
  } catch (error) {
    logger.error('[auth-storage] 인증 정보 삭제 실패:', error);
    throw error;
  }
}
