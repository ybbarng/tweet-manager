'use client';

interface SecurityWarningModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  showDontShowAgain?: boolean;
  dontShowAgain?: boolean;
  onDontShowAgainChange?: (value: boolean) => void;
}

export default function SecurityWarningModal({
  open,
  onClose,
  onConfirm,
  showDontShowAgain = false,
  dontShowAgain = false,
  onDontShowAgainChange,
}: SecurityWarningModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-amber-500 text-2xl flex-shrink-0">&#9888;</span>
          <div>
            <h3 className="font-bold text-lg mb-2">보안 경고</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              이 앱은 Twitter 계정에 대한 전체 접근 권한을 요청합니다. 트윗
              삭제를 포함한 모든 작업이 가능합니다.
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <strong className="text-foreground">
                이 프로그램의 개발자를 신뢰하는 경우에만 로그인하세요.
              </strong>
              <br />
              인증 정보는 로컬에만 저장되며 외부로 전송되지 않습니다.
            </p>
          </div>
        </div>

        {showDontShowAgain && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgainChange?.(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              다시 보지 않기
            </span>
          </label>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            닫기
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              동의하고 계속
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
