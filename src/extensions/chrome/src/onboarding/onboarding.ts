/**
 * Onboarding page script
 * Handles email verification and onboarding completion
 */

import { API_PATHS } from "../shared/api-paths";
import { DEFAULT_ONBOARDING_STATE, OnboardingState } from "../shared/types";
import { loadConfig, sendToBackend } from "../shared/utils";

const ONBOARDING_STATE_KEY = "onboardingState";

/**
 * Load onboarding state from storage
 */
async function loadOnboardingState(): Promise<OnboardingState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(ONBOARDING_STATE_KEY, (result) => {
      resolve(
        (result[ONBOARDING_STATE_KEY] as OnboardingState) ||
          DEFAULT_ONBOARDING_STATE
      );
    });
  });
}

/**
 * Save onboarding state to storage
 */
async function saveOnboardingState(state: OnboardingState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ONBOARDING_STATE_KEY]: state }, resolve);
  });
}

/**
 * Show error message
 */
function showError(message: string): void {
  const errorEl = document.getElementById("error-msg");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

/**
 * Hide error message
 */
function hideError(): void {
  const errorEl = document.getElementById("error-msg");
  if (errorEl) {
    errorEl.style.display = "none";
  }
}

/**
 * Show success state
 */
function showSuccess(userName?: string): void {
  const formState = document.getElementById("form-state");
  const successState = document.getElementById("success-state");
  const welcomeMsg = document.getElementById("welcome-msg");

  if (formState) formState.style.display = "none";
  if (successState) successState.style.display = "block";
  if (welcomeMsg && userName) {
    welcomeMsg.textContent = `${userName}님, Extension이 활성화되었습니다.`;
  }

  // 3초 후 탭 닫기
  setTimeout(() => {
    window.close();
  }, 3000);
}

/**
 * Set button loading state
 */
function setLoading(loading: boolean): void {
  const btn = document.getElementById("submit-btn") as HTMLButtonElement;
  const emailInput = document.getElementById("email") as HTMLInputElement;

  if (btn) {
    btn.disabled = loading;
    btn.innerHTML = loading
      ? '<span class="spinner"></span>확인 중...'
      : "확인";
  }
  if (emailInput) {
    emailInput.disabled = loading;
  }
}

/**
 * Handle form submission
 */
async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();
  hideError();

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const email = emailInput?.value?.trim();

  if (!email) {
    showError("이메일을 입력하세요.");
    return;
  }

  setLoading(true);

  try {
    const config = await loadConfig();

    // Step 1: Verify email
    const verifyResponse = await sendToBackend(
      API_PATHS.ONBOARDING_VERIFY,
      {
        device_id: config.id,
        email,
      },
      config.api
    );

    if (!verifyResponse.ok) {
      showError("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    const verifyData = await verifyResponse.json();

    if (!verifyData.success || !verifyData.data?.verified) {
      showError(
        "이메일을 확인할 수 없습니다. 조직에 등록된 이메일을 사용하세요."
      );
      setLoading(false);
      return;
    }

    const { userId, userName } = verifyData.data;

    // Step 2: Complete onboarding (only if we have a userId)
    if (userId) {
      const completeResponse = await sendToBackend(
        API_PATHS.ONBOARDING_COMPLETE,
        {
          device_id: config.id,
          email,
          user_id: userId,
        },
        config.api
      );

      if (!completeResponse.ok) {
        showError("온보딩 완료 처리에 실패했습니다. 다시 시도해주세요.");
        setLoading(false);
        return;
      }

      const completeData = await completeResponse.json();

      if (!completeData.success) {
        showError("온보딩 완료 처리에 실패했습니다.");
        setLoading(false);
        return;
      }
    }

    // Save onboarding state
    const onboardingState: OnboardingState = {
      completed: true,
      email,
      userId: userId || undefined,
      userName: userName || undefined,
      completedAt: Date.now(),
    };
    await saveOnboardingState(onboardingState);

    // Notify background script
    chrome.runtime.sendMessage({
      type: "ONBOARDING_COMPLETE",
      data: onboardingState,
    });

    // Show success
    showSuccess(userName);
  } catch (error) {
    console.error("Onboarding error:", error);
    showError("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    setLoading(false);
  }
}

/**
 * Initialize onboarding page
 */
async function init(): Promise<void> {
  // Check if already onboarded
  const state = await loadOnboardingState();
  if (state.completed) {
    showSuccess(state.userName);
    return;
  }

  // Set up form handler
  const form = document.getElementById("onboarding-form");
  form?.addEventListener("submit", handleSubmit);
}

// Initialize
document.addEventListener("DOMContentLoaded", init);
