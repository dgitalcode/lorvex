import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const synonyms = [
  { term: "montre", synonym: "watch", locale: "fr" },
  { term: "watch", synonym: "montre", locale: "en" },
  { term: "automatique", synonym: "automatic", locale: "fr" },
  { term: "automatic", synonym: "automatique", locale: "en" },
  { term: "plongeur", synonym: "diver", locale: "fr" },
  { term: "diver", synonym: "plongeur", locale: "en" },
  { term: "chrono", synonym: "chronographe", locale: "fr" },
  { term: "or", synonym: "gold", locale: "fr" },
  { term: "gold", synonym: "or", locale: "en" },
  { term: "acier", synonym: "steel", locale: "fr" },
  { term: "steel", synonym: "acier", locale: "en" },
  { term: "limité", synonym: "limited", locale: "fr" },
  { term: "limited", synonym: "limité", locale: "en" },
  { term: "ساعة", synonym: "montre", locale: "ar" },
  { term: "ساعة", synonym: "watch", locale: "ar" },
];

async function main() {
  for (const row of synonyms) {
    await prisma.searchSynonym.upsert({
      where: {
        term_synonym_locale: {
          term: row.term,
          synonym: row.synonym,
          locale: row.locale,
        },
      },
      create: row,
      update: {},
    });
  }
  console.log(`Seeded ${synonyms.length} search synonyms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
