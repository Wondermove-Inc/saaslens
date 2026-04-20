// FleetDM Integration 생성 및 동기화 테스트
// 실행: npx tsx scripts/test-fleetdm-sync.ts

import { prisma } from "../src/lib/db";
import { FleetDMClient } from "../src/lib/services/fleetdm/client";
import { syncAllFromFleetDM } from "../src/lib/services/fleetdm/sync";

const FLEETDM_URL = "http://localhost:8080";
const FLEETDM_TOKEN =
  "hlAa5scixK4933FVSmXJlkZUv8T/JrDeDqM5d4GLOoLiDhjIxsRevuV1yaWXjKG3hzBvfXzFWMeEI+SBBuJA4Q==";

async function main() {
  console.log("=== FleetDM Integration Setup ===\n");

  // 1. 조직 찾기 또는 생성
  let org = await prisma.organization.findFirst();

  if (!org) {
    console.log("Creating test organization...");
    org = await prisma.organization.create({
      data: {
        name: "Test Organization",
        slug: "test-org",
        plan: "ENTERPRISE",
      },
    });
    console.log("✅ Created organization:", org.id);
  } else {
    console.log("✅ Found organization:", org.id, org.name);
  }

  // 2. FleetDM Integration 찾기 또는 생성
  let integration = await prisma.integration.findFirst({
    where: {
      organizationId: org.id,
      type: "FLEETDM",
    },
  });

  if (!integration) {
    console.log("Creating FleetDM integration...");
    integration = await prisma.integration.create({
      data: {
        organizationId: org.id,
        type: "FLEETDM",
        status: "ACTIVE",
        credentials: {
          baseUrl: FLEETDM_URL,
          apiToken: FLEETDM_TOKEN,
        },
      },
    });
    console.log("✅ Created FleetDM integration:", integration.id);
  } else {
    // credentials 업데이트
    integration = await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: "ACTIVE",
        credentials: {
          baseUrl: FLEETDM_URL,
          apiToken: FLEETDM_TOKEN,
        },
      },
    });
    console.log("✅ Updated FleetDM integration:", integration.id);
  }

  // 3. FleetDM 클라이언트 연결 테스트
  console.log("\nTesting FleetDM connection...");
  const client = new FleetDMClient({
    baseUrl: FLEETDM_URL,
    apiToken: FLEETDM_TOKEN,
  });

  const isConnected = await client.testConnection();
  console.log("✅ FleetDM connected:", isConnected);

  if (!isConnected) {
    console.error("❌ Cannot connect to FleetDM server");
    process.exit(1);
  }

  // 4. 동기화 실행
  console.log("\n=== Running Sync ===\n");

  const result = await syncAllFromFleetDM(client, org.id, {
    syncSoftware: true,
    onProgress: (current, total) => {
      console.log(`Progress: ${current}/${total}`);
    },
  });

  console.log("\n=== Sync Result ===");
  console.log("Hosts synced:", result.hostsSync);
  console.log("Software synced:", result.softwareSync);
  console.log("Errors:", result.errors.length);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((e) => console.log(" -", e));
  }

  // 5. 동기화된 Device 확인
  const devices = await prisma.device.findMany({
    where: { organizationId: org.id },
    include: {
      deviceApps: {
        take: 15,
        orderBy: { name: "asc" },
        where: {
          name: {
            endsWith: ".app",
          },
        },
      },
    },
  });

  console.log("\n=== Synced Devices ===");
  console.log("Total devices:", devices.length);

  for (const device of devices) {
    console.log("\nDevice:", device.hostname);
    console.log("  Fleet ID:", device.fleetId);
    console.log("  Platform:", device.platform);
    console.log("  Status:", device.status);
    console.log("  OS Version:", device.osVersion);
    console.log("  Hardware Model:", device.hardwareModel);
    console.log("  Serial:", device.hardwareSerial);
    console.log("  Last Seen:", device.lastSeenAt);
    console.log("  DeviceApps (sample macOS apps):", device.deviceApps.length);
    device.deviceApps.forEach((app) => {
      console.log("    -", app.name, app.version || "");
    });
  }

  // 6. DeviceApp 통계
  const totalApps = await prisma.deviceApp.count();
  const appsByStatus = await prisma.deviceApp.groupBy({
    by: ["approvalStatus"],
    _count: true,
  });

  console.log("\n=== DeviceApp Stats ===");
  console.log("Total DeviceApps:", totalApps);
  appsByStatus.forEach((stat) => {
    console.log(" ", stat.approvalStatus + ":", stat._count);
  });

  // 7. Integration 상태 업데이트
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
    },
  });

  console.log("\n✅ Sync completed successfully!");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
