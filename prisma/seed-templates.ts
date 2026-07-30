/**
 * Seed / upsert live template catalog (idempotent).
 * Usage: npx tsx prisma/seed-templates.ts
 */
import { PrismaClient } from "@prisma/client";
import { TEMPLATE_PRODUCT_SEEDS } from "../src/lib/templates/seed-products";

const prisma = new PrismaClient();

async function main() {
  for (const product of TEMPLATE_PRODUCT_SEEDS) {
    await prisma.templateProduct.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        type: product.type,
        priceInr: product.priceInr,
        description: product.description,
        sortOrder: product.sortOrder,
        thumbnailUrl: product.thumbnailUrl ?? null,
        copyLink: product.copyLink ?? null,
        active: product.active ?? true,
      },
      update: {
        name: product.name,
        type: product.type,
        priceInr: product.priceInr,
        description: product.description,
        sortOrder: product.sortOrder,
        active: product.active ?? true,
        thumbnailUrl: product.thumbnailUrl ?? null,
        copyLink: product.copyLink ?? null,
      },
    });
  }

  const liveSlugs = TEMPLATE_PRODUCT_SEEDS.map((p) => p.slug);
  await prisma.templateProduct.updateMany({
    where: { slug: { notIn: liveSlugs } },
    data: { active: false },
  });

  console.log(`Seeded ${TEMPLATE_PRODUCT_SEEDS.length} live template product(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
