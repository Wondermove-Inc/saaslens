// src/actions/extensions/auth-mgmt.ts
"use server";

import { generateToken, hashToken } from "@/lib/api/extension-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";

/**
 * Extension auth metadata (without sensitive hash)
 */
export interface ExtensionAuthInfo {
  id: string;
  name: string | null;
  deviceId: string | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Input for creating extension auth
 */
export interface CreateExtensionAuthInput {
  organizationId: string;
  name?: string;
  deviceId?: string;
  expiresAt?: Date;
}

/**
 * Result of creating extension auth
 */
export interface CreateExtensionAuthResult extends ActionState {
  rawValue?: string; // Only returned once on creation
  authId?: string;
}

/**
 * Result of listing extension auths
 */
export interface ListExtensionAuthsResult extends ActionState {
  auths?: ExtensionAuthInfo[];
}

/**
 * Create a new extension auth credential for an organization
 *
 * @param input - Organization ID, optional name, deviceId, and expiration
 * @returns The raw credential value (only shown once) and auth ID
 */
async function _createExtensionAuth(
  input: CreateExtensionAuthInput
): Promise<CreateExtensionAuthResult> {
  try {
    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    // Generate raw value and hash it
    const rawValue = generateToken();
    const hashedValue = hashToken(rawValue);

    // Create the auth record
    const auth = await prisma.extensionApiToken.create({
      data: {
        organizationId: input.organizationId,
        token: hashedValue,
        name: input.name || "Extension Auth",
        deviceId: input.deviceId || null,
        expiresAt: input.expiresAt || null,
        isActive: true,
      },
    });

    return {
      success: true,
      rawValue, // Only returned once - user must save this
      authId: auth.id,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to create extension auth");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create extension auth",
    };
  }
}
export const createExtensionAuth = withLogging(
  "createExtensionAuth",
  _createExtensionAuth
);

/**
 * List all extension auths for an organization
 *
 * @param organizationId - The organization ID
 * @returns List of auth metadata (without sensitive hash values)
 */
export async function listExtensionAuths(
  organizationId: string
): Promise<ListExtensionAuthsResult> {
  try {
    const auths = await prisma.extensionApiToken.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        deviceId: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // Note: token (hash) is NOT selected for security
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, auths };
  } catch (error) {
    logger.error({ err: error }, "Failed to list extension auths");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to list extension auths",
    };
  }
}

/**
 * Revoke an extension auth (set isActive to false)
 *
 * @param authId - The auth ID to revoke
 * @param organizationId - The organization ID (for authorization check)
 * @returns Success status
 */
async function _revokeExtensionAuth(
  authId: string,
  organizationId: string
): Promise<ActionState> {
  try {
    // Verify auth exists and belongs to the organization
    const auth = await prisma.extensionApiToken.findUnique({
      where: { id: authId },
    });

    if (!auth || auth.organizationId !== organizationId) {
      return { success: false, error: "Extension auth not found" };
    }

    await prisma.extensionApiToken.update({
      where: { id: authId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to revoke extension auth");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to revoke extension auth",
    };
  }
}
export const revokeExtensionAuth = withLogging(
  "revokeExtensionAuth",
  _revokeExtensionAuth
);

/**
 * Delete an extension auth permanently
 *
 * @param authId - The auth ID to delete
 * @param organizationId - The organization ID (for authorization check)
 * @returns Success status
 */
async function _deleteExtensionAuth(
  authId: string,
  organizationId: string
): Promise<ActionState> {
  try {
    // Verify auth exists and belongs to the organization
    const auth = await prisma.extensionApiToken.findUnique({
      where: { id: authId },
    });

    if (!auth || auth.organizationId !== organizationId) {
      return { success: false, error: "Extension auth not found" };
    }

    await prisma.extensionApiToken.delete({
      where: { id: authId },
    });

    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to delete extension auth");
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete extension auth",
    };
  }
}
export const deleteExtensionAuth = withLogging(
  "deleteExtensionAuth",
  _deleteExtensionAuth
);
