import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
  adapter,
});

const BuyerId = process.env.BUYER_ID;
const AdminId = process.env.ADMIN_ID;
const VendorId = process.env.VENDOR_ID;

if (!BuyerId || !AdminId || !VendorId) {
  throw new Error(
    "Missing BUYER_ID, ADMIN_ID or VENDOR_ID in your environment. Set them before running the seed."
  );
}

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // --- Core users (tied to your real env IDs) ---
  const buyer = await prisma.user.upsert({
    where: { id: BuyerId },
    update: {},
    create: {
      id: BuyerId,
      first_name: "Ada",
      last_name: "Obi",
      email: "ada.buyer@example.com",
      password: passwordHash,
      role: "BUYER",
      phone: "+2348011112222",
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: AdminId },
    update: {},
    create: {
      id: AdminId,
      first_name: "Tolu",
      last_name: "Bankole",
      email: "tolu.admin@example.com",
      password: passwordHash,
      role: "ADMIN",
      phone: "+2348022223333",
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { id: VendorId },
    update: {},
    create: {
      id: VendorId,
      first_name: "Chidi",
      last_name: "Eze",
      email: "chidi.vendor@example.com",
      password: passwordHash,
      role: "VENDOR",
      phone: "+2348033334444",
    },
  });

  // --- Extra buyers and a second vendor, so the marketplace looks alive ---
  const buyer2 = await prisma.user.upsert({
    where: { email: "femi.buyer@example.com" },
    update: {},
    create: {
      first_name: "Femi",
      last_name: "Alade",
      email: "femi.buyer@example.com",
      password: passwordHash,
      role: "BUYER",
      phone: "+2348044445555",
    },
  });

  const vendorUser2 = await prisma.user.upsert({
    where: { email: "ngozi.vendor@example.com" },
    update: {},
    create: {
      first_name: "Ngozi",
      last_name: "Umeh",
      email: "ngozi.vendor@example.com",
      password: passwordHash,
      role: "VENDOR",
      phone: "+2348055556666",
    },
  });

  // --- Vendor profiles ---
  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      storeName: "Chidi's Electronics",
      bankAccount: "0123456789",
      bankCode: "058",
      isVerified: true,
    },
  });

  const vendorProfile2 = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser2.id },
    update: {},
    create: {
      userId: vendorUser2.id,
      storeName: "Ngozi's Fashion House",
      bankAccount: "0198765432",
      bankCode: "011",
      isVerified: true,
    },
  });

  // --- Products (several per vendor now that vendorId isn't unique) ---
  const [headphones, speaker, smartwatch] = await Promise.all([
    prisma.product.create({
      data: {
        vendorId: vendorProfile.id,
        title: "Wireless Bluetooth Headphones",
        description: "Over-ear headphones with noise cancellation and 30-hour battery life.",
        price: 45000.0,
        stock: 25,
        imageUrl: "https://example.com/images/headphones.jpg",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        vendorId: vendorProfile.id,
        title: "Portable Bluetooth Speaker",
        description: "Waterproof speaker with 12-hour playtime.",
        price: 18000.0,
        stock: 40,
        imageUrl: "https://example.com/images/speaker.jpg",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        vendorId: vendorProfile.id,
        title: "Fitness Smartwatch",
        description: "Heart-rate and sleep tracking with a 7-day battery.",
        price: 32000.0,
        stock: 15,
        imageUrl: "https://example.com/images/smartwatch.jpg",
        isActive: true,
      },
    }),
  ]);

  const [ankaraDress, leatherBag] = await Promise.all([
    prisma.product.create({
      data: {
        vendorId: vendorProfile2.id,
        title: "Ankara Print Dress",
        description: "Handmade Ankara dress, custom sizing available.",
        price: 25000.0,
        stock: 10,
        imageUrl: "https://example.com/images/ankara-dress.jpg",
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        vendorId: vendorProfile2.id,
        title: "Leather Tote Bag",
        description: "Full-grain leather tote, hand-stitched.",
        price: 38000.0,
        stock: 12,
        imageUrl: "https://example.com/images/leather-bag.jpg",
        isActive: true,
      },
    }),
  ]);

  // --- Order 1: buyer, fully paid and confirmed, escrow released, payout paid ---
  const order1 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      totalAmount: 63000.0, // headphones + speaker
      status: "CONFIRMED",
      confirmedAt: new Date(),
      items: {
        create: [
          {
            productId: headphones.id,
            vendorId: vendorProfile.id,
            quantity: 1,
            unitPrice: 45000.0,
          },
          {
            productId: speaker.id,
            vendorId: vendorProfile.id,
            quantity: 1,
            unitPrice: 18000.0,
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order1.id,
      provider: "paystack",
      reference: "PSK_SEED_REF_001",
      amount: 63000.0,
      isEscrow: false,
      releasedAt: new Date(),
    },
  });

  await prisma.payout.create({
    data: {
      vendorId: vendorProfile.id,
      amount: 59850.0, // after 5% platform fee
      status: "PAID",
      reference: "PSK_PAYOUT_REF_001",
      paidAt: new Date(),
    },
  });

  // --- Order 2: buyer, paid but still in escrow (not yet confirmed) ---
  const order2 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      totalAmount: 32000.0, // smartwatch
      status: "PAID",
      items: {
        create: [
          {
            productId: smartwatch.id,
            vendorId: vendorProfile.id,
            quantity: 1,
            unitPrice: 32000.0,
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order2.id,
      provider: "paystack",
      reference: "PSK_SEED_REF_002",
      amount: 32000.0,
      isEscrow: true,
    },
  });

  // --- Order 3: second buyer, from the second vendor, still pending payment ---
  const order3 = await prisma.order.create({
    data: {
      buyerId: buyer2.id,
      totalAmount: 63000.0, // dress + bag
      status: "PENDING",
      items: {
        create: [
          {
            productId: ankaraDress.id,
            vendorId: vendorProfile2.id,
            quantity: 1,
            unitPrice: 25000.0,
          },
          {
            productId: leatherBag.id,
            vendorId: vendorProfile2.id,
            quantity: 1,
            unitPrice: 38000.0,
          },
        ],
      },
    },
  });

  // --- Reviews (only makes sense on the confirmed/delivered order) ---
  await prisma.review.create({
    data: {
      productId: headphones.id,
      userId: buyer.id,
      rating: 5,
      comment: "Great sound quality, arrived fast.",
    },
  });

  await prisma.review.create({
    data: {
      productId: speaker.id,
      userId: buyer.id,
      rating: 4,
      comment: "Good bass, wish the battery lasted a bit longer.",
    },
  });

  console.log("Seed complete:");
  console.log({
    users: [buyer.email, admin.email, vendorUser.email, buyer2.email, vendorUser2.email],
    vendors: [vendorProfile.storeName, vendorProfile2.storeName],
    products: [headphones.title, speaker.title, smartwatch.title, ankaraDress.title, leatherBag.title],
    orders: { order1: order1.status, order2: order2.status, order3: order3.status },
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });