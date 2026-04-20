import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    otpToken: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/notification/email-auth", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/logging", () => ({
  withLogging: (_name: string, fn: unknown) => fn,
}));

import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/services/notification/email-auth";
import { sendOtp, verifyOtp } from "./otp";

type MockedPrisma = {
  user: { findUnique: ReturnType<typeof vi.fn> };
  otpToken: {
    findFirst: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const db = prisma as unknown as MockedPrisma;
const mockedSendOtpEmail = sendOtpEmail as ReturnType<typeof vi.fn>;

const TEST_EMAIL = "test@example.com";
const TEST_CODE = "123456";

describe("sendOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: TEST_EMAIL,
      name: "Test User",
    });
    db.otpToken.findFirst.mockResolvedValue(null);
    db.otpToken.deleteMany.mockResolvedValue({ count: 0 });
    db.otpToken.create.mockResolvedValue({
      id: "token-1",
      email: TEST_EMAIL,
      code: TEST_CODE,
      expires: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
    });
    mockedSendOtpEmail.mockResolvedValue({ success: true });
  });

  it("returns USER_NOT_FOUND error when email is not registered", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await sendOtp("unknown@example.com");
    expect(result.success).toBe(false);
    expect(result.error).toBe("USER_NOT_FOUND");
  });

  it("returns COOLDOWN_ACTIVE error when OTP was sent within 60 seconds", async () => {
    db.otpToken.findFirst.mockResolvedValue({
      id: "old-token",
      email: TEST_EMAIL,
      createdAt: new Date(Date.now() - 30 * 1000),
    });
    const result = await sendOtp(TEST_EMAIL);
    expect(result.success).toBe(false);
    expect(result.error).toBe("COOLDOWN_ACTIVE");
  });

  it("sends OTP successfully when user exists and no cooldown", async () => {
    const result = await sendOtp(TEST_EMAIL);
    expect(result.success).toBe(true);
  });

  it("deletes existing tokens before creating new one", async () => {
    await sendOtp(TEST_EMAIL);
    expect(db.otpToken.deleteMany).toHaveBeenCalledWith({
      where: { email: TEST_EMAIL },
    });
    expect(db.otpToken.create).toHaveBeenCalled();
  });

  it("calls sendOtpEmail with the user's email", async () => {
    await sendOtp(TEST_EMAIL);
    expect(mockedSendOtpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: TEST_EMAIL })
    );
  });

  it("generates a 6-digit numeric code", async () => {
    await sendOtp(TEST_EMAIL);
    const createData = db.otpToken.create.mock.calls[0][0].data;
    expect(createData.code).toMatch(/^\d{6}$/);
  });

  it("returns EMAIL_SEND_FAILED error when email service fails", async () => {
    mockedSendOtpEmail.mockResolvedValue({
      success: false,
      error: "Resend API error",
    });
    const result = await sendOtp(TEST_EMAIL);
    expect(result.success).toBe(false);
    expect(result.error).toBe("EMAIL_SEND_FAILED");
  });
});

describe("verifyOtp", () => {
  const validToken = {
    id: "token-1",
    email: TEST_EMAIL,
    code: TEST_CODE,
    expires: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db.otpToken.findFirst.mockResolvedValue(validToken);
    db.otpToken.delete.mockResolvedValue(validToken);
    db.otpToken.update.mockResolvedValue({ ...validToken, attempts: 1 });
  });

  it("returns NO_ACTIVE_OTP when no token found for email", async () => {
    db.otpToken.findFirst.mockResolvedValue(null);
    const result = await verifyOtp(TEST_EMAIL, TEST_CODE);
    expect(result.success).toBe(false);
    expect(result.error).toBe("NO_ACTIVE_OTP");
  });

  it("returns MAX_ATTEMPTS_EXCEEDED when attempts is 5 or more", async () => {
    db.otpToken.findFirst.mockResolvedValue({ ...validToken, attempts: 5 });
    const result = await verifyOtp(TEST_EMAIL, "000000");
    expect(result.success).toBe(false);
    expect(result.error).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("returns INVALID_OTP and increments attempts for wrong code", async () => {
    const result = await verifyOtp(TEST_EMAIL, "000000");
    expect(result.success).toBe(false);
    expect(result.error).toBe("INVALID_OTP");
    expect(db.otpToken.update).toHaveBeenCalledWith({
      where: { id: validToken.id },
      data: { attempts: { increment: 1 } },
    });
  });

  it("returns success and deletes token for correct code", async () => {
    const result = await verifyOtp(TEST_EMAIL, TEST_CODE);
    expect(result.success).toBe(true);
    expect(db.otpToken.delete).toHaveBeenCalledWith({
      where: { id: validToken.id },
    });
  });

  it("does not call delete or update when no token found", async () => {
    db.otpToken.findFirst.mockResolvedValue(null);
    await verifyOtp(TEST_EMAIL, TEST_CODE);
    expect(db.otpToken.delete).not.toHaveBeenCalled();
    expect(db.otpToken.update).not.toHaveBeenCalled();
  });

  it("queries for non-expired token using expires > now filter", async () => {
    await verifyOtp(TEST_EMAIL, TEST_CODE);
    const findFirstCall = db.otpToken.findFirst.mock.calls[0][0];
    expect(findFirstCall.where.email).toBe(TEST_EMAIL);
    expect(findFirstCall.where.expires).toHaveProperty("gt");
  });
});
