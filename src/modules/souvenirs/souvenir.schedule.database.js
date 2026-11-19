import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { replacePricingSchedule, getPricingSchedule } from "./souvenir.service.js";

let productId;

after(async () => {
  if (productId) {
    await prisma.souvenirProduct.delete({ where: { id: productId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

test("persists schedule replacements atomically and serializes stale concurrent writers", async () => {
  const product = await prisma.souvenirProduct.create({
    data: {
      name: "Pricing Schedule Integration Test",
      slug: `pricing-schedule-test-${randomUUID()}`,
    },
  });
  productId = product.id;

  const first = await replacePricingSchedule(productId, {
    expectedVersion: 0,
    bands: [
      { minQuantity: 20, unitPrice: "700.00" },
      { minQuantity: 51, unitPrice: "500.00" },
    ],
  });

  assert.equal(first.version, 1);
  assert.equal(first.isValid, true);
  assert.deepEqual(first.bands.map((band) => [band.minQuantity, band.maxQuantity]), [
    [20, 50],
    [51, null],
  ]);

  await assert.rejects(
    replacePricingSchedule(productId, {
      expectedVersion: 0,
      bands: [{ minQuantity: 1, unitPrice: "100.00" }],
    }),
    (error) => error.statusCode === 409,
  );

  await assert.rejects(
    replacePricingSchedule(productId, {
      expectedVersion: 1,
      bands: [
        { minQuantity: 20, unitPrice: "700.00" },
        { minQuantity: 20, unitPrice: "500.00" },
      ],
    }),
    /strictly increasing/,
  );

  const unchanged = await getPricingSchedule(productId);
  assert.equal(unchanged.version, 1);
  assert.deepEqual(unchanged.bands.map((band) => band.id), first.bands.map((band) => band.id));

  const concurrent = await Promise.allSettled([
    replacePricingSchedule(productId, {
      expectedVersion: 1,
      bands: [
        { minQuantity: 10, unitPrice: "800.00" },
        { minQuantity: 100, unitPrice: "600.00" },
      ],
    }),
    replacePricingSchedule(productId, {
      expectedVersion: 1,
      bands: [
        { minQuantity: 25, unitPrice: "750.00" },
        { minQuantity: 75, unitPrice: "550.00" },
      ],
    }),
  ]);

  assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((result) => result.status === "rejected" && result.reason.statusCode === 409).length, 1);

  const current = await getPricingSchedule(productId);
  assert.equal(current.version, 2);
  assert.equal(current.isValid, true);

  const currentCount = await prisma.souvenirPriceTier.count({
    where: { productId, isCurrent: true, version: 2 },
  });
  const historicalCount = await prisma.souvenirPriceTier.count({
    where: { productId, isCurrent: false, version: 1 },
  });
  assert.equal(currentCount, 2);
  assert.equal(historicalCount, 2);

  await assert.rejects(
    prisma.souvenirPriceTier.create({
      data: {
        productId,
        label: "Direct overlapping write",
        minQuantity: current.bands[0].minQuantity,
        maxQuantity: current.bands[0].minQuantity,
        totalPrice: "1.00",
        unitPrice: "1.00",
        currency: "NGN",
        active: true,
        displayOrder: 99,
        version: 2,
        isCurrent: true,
      },
    }),
  );
});
