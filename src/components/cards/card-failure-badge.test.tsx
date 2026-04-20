// src/components/cards/card-failure-badge.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CardFailureBadge } from "./card-failure-badge";

describe("CardFailureBadge", () => {
  afterEach(() => {
    cleanup();
  });

  describe("when lastSyncAt set and no error", () => {
    it("should render success badge", () => {
      render(
        <CardFailureBadge
          lastSyncAt={new Date("2024-01-01")}
          lastError={null}
          consecutiveFailCount={0}
        />
      );

      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).toHaveClass("bg-success-muted");
      expect(badge).toHaveClass("text-success-muted-foreground");
    });
  });

  describe("when lastError set", () => {
    it("should render warning badge", () => {
      render(
        <CardFailureBadge
          lastSyncAt={new Date("2024-01-01")}
          lastError="Connection timeout"
          consecutiveFailCount={1}
        />
      );

      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).toHaveClass("bg-warning-muted");
      expect(badge).toHaveClass("text-warning-muted-foreground");
    });
  });

  describe("when consecutiveFailCount >= 3", () => {
    it("should render destructive badge", () => {
      render(
        <CardFailureBadge
          lastSyncAt={new Date("2024-01-01")}
          lastError={null}
          consecutiveFailCount={3}
        />
      );

      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).toHaveClass("bg-destructive-muted");
      expect(badge).toHaveClass("text-destructive-muted-foreground");
    });

    it("should render destructive badge when count > 3", () => {
      render(
        <CardFailureBadge
          lastSyncAt={new Date("2024-01-01")}
          lastError={null}
          consecutiveFailCount={5}
        />
      );

      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).toHaveClass("bg-destructive-muted");
    });
  });

  describe("when no lastSyncAt (미동기화)", () => {
    it("should render secondary badge", () => {
      render(
        <CardFailureBadge
          lastSyncAt={null}
          lastError={null}
          consecutiveFailCount={0}
        />
      );

      // Should render with secondary/default variant (no special color)
      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).not.toHaveClass("bg-success-muted");
      expect(badge).not.toHaveClass("bg-warning-muted");
      expect(badge).not.toHaveClass("bg-destructive-muted");
    });
  });

  describe("destructive takes priority over warning", () => {
    it("should show destructive when both lastError and consecutiveFailCount >= 3", () => {
      render(
        <CardFailureBadge
          lastSyncAt={new Date("2024-01-01")}
          lastError="Some error"
          consecutiveFailCount={3}
        />
      );

      const badge = screen.getByTestId("card-failure-badge");
      expect(badge).toHaveClass("bg-destructive-muted");
      expect(badge).not.toHaveClass("bg-warning-muted");
    });
  });
});
