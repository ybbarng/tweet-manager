/** IPC 응답 타입 */
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 성공 응답 생성 */
export function success<T>(data?: T): IpcResponse<T> {
  return data !== undefined ? { success: true, data } : { success: true };
}

/** 실패 응답 생성 */
export function failure(error: unknown): IpcResponse<never> {
  const message = error instanceof Error ? error.message : String(error);
  return { success: false, error: message };
}

/** IPC 핸들러 래퍼 - 에러 처리 자동화 */
export async function handleIpc<T>(
  fn: () => Promise<T>,
): Promise<IpcResponse<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    return failure(error);
  }
}
