import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  const paymentCount = await prisma.paymentRecord.count();
  const cardCount = await prisma.corporateCard.count();
  const transactionCount = await prisma.cardTransaction.count();

  console.log("=== DB 현황 ===");
  console.log("PaymentRecord (결제내역):", paymentCount, "건");
  console.log("CorporateCard (법인카드):", cardCount, "건");
  console.log("CardTransaction (카드거래):", transactionCount, "건");

  if (cardCount > 0) {
    const cards = await prisma.corporateCard.findMany({
      select: { id: true, cardName: true, lastSyncAt: true }
    });
    console.log("\n=== 등록된 카드 ===");
    cards.forEach(c => {
      console.log(`- ${c.cardName} (lastSync: ${c.lastSyncAt || '없음'})`);
    });
  }

  if (transactionCount > 0) {
    console.log("\n=== 최근 카드거래 5건 ===");
    const transactions = await prisma.cardTransaction.findMany({
      take: 5,
      orderBy: { transactionDate: "desc" },
      select: { merchantName: true, amount: true, transactionDate: true }
    });
    transactions.forEach(t => {
      console.log(`- ${t.merchantName}: ${t.amount}원 (${t.transactionDate.toISOString().split('T')[0]})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
