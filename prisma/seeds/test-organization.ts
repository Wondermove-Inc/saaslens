// prisma/seeds/test-organization.ts
// 가상 TestCorp 조직 시드 데이터

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedTestOrganization() {
  console.log("🏢 TestCorp 조직 시드 데이터 생성 중...");

  // 조직 생성 (이미 존재하면 skip)
  const org = await prisma.organization.upsert({
    where: { domain: "testcorp.com" },
    update: {},
    create: {
      name: "TestCorp Inc.",
      domain: "testcorp.com",
      plan: "ENTERPRISE",
    },
  });

  console.log(`✅ 조직 생성: ${org.name} (${org.id})`);

  // 관리자 생성
  const admin = await prisma.user.upsert({
    where: {
      email_organizationId: {
        email: "admin@testcorp.com",
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      email: "admin@testcorp.com",
      name: "Admin User",
      role: "ADMIN",
      department: "IT",
      jobTitle: "System Administrator",
      employeeId: "EMP001",
      organizationId: org.id,
      status: "ACTIVE",
    },
  });

  console.log(`✅ 관리자 생성: ${admin.email}`);

  // 팀 생성
  const teams = ["Engineering", "Marketing", "HR", "Finance"];
  for (const teamName of teams) {
    await prisma.team.upsert({
      where: {
        name_organizationId: {
          name: teamName,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        name: teamName,
        organizationId: org.id,
        managerId: admin.id,
      },
    });
    console.log(`✅ 팀 생성: ${teamName}`);
  }

  console.log("🎉 TestCorp 시드 데이터 생성 완료!");
  console.log(`📋 조직 ID: ${org.id}`);
  console.log(`📧 관리자: admin@testcorp.com`);
  console.log(`📁 테스트 CSV: public/templates/test-users-sample.csv (25명)`);
}

// 단독 실행 시
if (require.main === module) {
  seedTestOrganization()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
