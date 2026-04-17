/**
 * JSDOM에서는 HTMLFormElement.requestSubmit이 미구현이므로
 * 테스트/스토리북에서 폼 submit 호출 시 에러를 방지하기 위한 폴리필.
 */
export function applyRequestSubmitPolyfill() {
  if (typeof HTMLFormElement === "undefined") return;

  Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
    value: function submitPolyfill(this: HTMLFormElement) {
      this.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    },
    writable: true,
    configurable: true,
  });
}
