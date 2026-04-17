/**
 * AES-256-GCM 암호화 유틸리티
 * 법인카드 인증 정보 등 민감한 데이터 암호화에 사용
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 문자열을 AES-256-GCM으로 암호화
 * @param text 암호화할 평문
 * @returns IV + AuthTag + EncryptedData (hex 인코딩)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // IV + AuthTag + EncryptedData 형식으로 반환
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * AES-256-GCM으로 암호화된 문자열을 복호화
 * @param encryptedText 암호화된 문자열 (IV + AuthTag + EncryptedData)
 * @returns 복호화된 평문
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // IV, AuthTag, EncryptedData 분리
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    "hex"
  );
  const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * JSON 객체를 암호화
 * @param data 암호화할 객체
 * @returns 암호화된 문자열
 */
export function encryptJson<T>(data: T): string {
  return encrypt(JSON.stringify(data));
}

/**
 * 암호화된 문자열을 JSON 객체로 복호화
 * @param encryptedText 암호화된 문자열
 * @returns 복호화된 객체
 */
export function decryptJson<T>(encryptedText: string): T {
  return JSON.parse(decrypt(encryptedText)) as T;
}

/**
 * 환경변수에서 암호화 키 가져오기
 * @returns 32바이트 키 버퍼
 * @throws ENCRYPTION_KEY가 설정되지 않았거나 32자가 아닌 경우
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 characters, got ${key.length}`
    );
  }
  return Buffer.from(key);
}

/**
 * 카드번호 마스킹 (앞 4자리, 뒤 4자리만 표시)
 * @param cardNo 카드번호
 * @returns 마스킹된 카드번호 (예: 1234****5678)
 */
export function maskCardNumber(cardNo: string): string {
  const cleaned = cardNo.replace(/\D/g, "");
  if (cleaned.length < 8) {
    return "*".repeat(cleaned.length);
  }
  const first4 = cleaned.slice(0, 4);
  const last4 = cleaned.slice(-4);
  const masked = "*".repeat(cleaned.length - 8);
  return `${first4}${masked}${last4}`;
}

/**
 * 카드번호에서 마지막 4자리 추출
 * @param cardNo 카드번호
 * @returns 마지막 4자리
 */
export function getCardLast4(cardNo: string): string {
  const cleaned = cardNo.replace(/\D/g, "");
  return cleaned.slice(-4);
}
