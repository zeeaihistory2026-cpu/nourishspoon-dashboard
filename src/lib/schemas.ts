import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  slug: z.string().max(140).optional(),
  description: z.string().max(5000).default(""),
  categoryId: z.string().min(1, "Category is required"),
  categoryName: z.string().min(1),
  price: z.number().int().min(1, "Price must be greater than zero"),
  compareAtPrice: z.number().min(0).optional().nullable(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        stock: z.number().int().min(0).nullable().optional(),
        active: z.boolean().optional(),
        label: z.string().min(1),
        price: z.number().int().min(1),
        compareAtPrice: z.number().min(0).optional().nullable(),
        per100g: z.string().optional(),
      }),
    )
    .default([]),
  weight: z.string().max(40).default(""),
  stock: z.number().int().min(0).nullable().default(null),
  inventoryMode: z.enum(["aggregate", "per_variant"]).optional(),
  images: z.array(z.string().url("Must be a valid URL")).default([]),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .default([]),
  benefits: z
    .array(z.object({ icon: z.string().min(1), label: z.string().min(1) }))
    .default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});

export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().max(80).optional(),
  sortOrder: z.number().int().default(0),
});

export const couponSchema = z.object({
  code: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{4,24}$/,
      "Use 4-24 letters, digits, dashes or underscores",
    ),
  description: z.string().max(300).default(""),
  discountType: z.enum(["percent", "fixed"]),
  value: z.number().int().min(1, "Value must be a positive whole number"),
  minSubtotal: z.number().int().min(0).optional().nullable(),
  maximumDiscount: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  usageLimitPerUser: z.number().int().min(1).optional().nullable(),
  newUsersOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const pointsAdjustSchema = z.object({
  userId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "Amount cannot be zero"),
  reason: z.string().min(3, "A reason is required").max(300),
});

export const referralConfigSchema = z.object({
  headline: z.string().max(120).default(""),
  copy: z.string().max(2000).default(""),
  referrerReward: z.number().int().min(0).max(100000).default(100),
  welcomeValue: z.number().int().min(0).max(100000).optional(),
  welcomeType: z.enum(["fixed", "percent"]).optional(),
  minimumOrder: z.number().int().min(0).max(100000).optional(),
  validityDays: z.number().int().min(1).max(3650).optional(),
  monthlyLimit: z.number().int().min(1).max(100000).optional(),
  campaignEndsAt: z.string().optional().nullable(),
  terms: z.string().max(3000).default(""),
  isActive: z.boolean().default(true),
});

export const notificationSchema = z.object({
  title: z.string().min(2, "Title is required").max(120),
  body: z.string().min(2, "Message is required").max(1000),
  imageUrl: z.string().url().optional().nullable(),
  deepLink: z.string().max(300).optional().nullable(),
  audience: z.literal("all").default("all"),
  segment: z.string().max(120).optional().nullable(),
});

export const paymentMethodSchema = z.object({
  title: z.string().min(2, "Title is required").max(80),
  icon: z.string().max(60).default(""),
  instructions: z.string().max(2000).default(""),
  accountDetails: z.string().max(1000).default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const deliveryInfoSchema = z.object({
  title: z.string().min(2, "Title is required").max(80),
  description: z.string().max(2000).default(""),
  icon: z.string().max(60).default(""),
  charge: z.number().min(0).optional().nullable(),
  freeAbove: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const faqSchema = z.object({
  category: z.string().min(2, "Category is required").max(60),
  question: z.string().min(4, "Question is required").max(300),
  answer: z.string().min(4, "Answer is required").max(4000),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const onboardingSlideSchema = z.object({
  title: z.string().min(2, "Title is required").max(120),
  body: z.string().max(1000).default(""),
  imageUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const homeContentSchema = z.object({
  hero: z.object({
    heading: z.string().max(120).default(""),
    copy: z.string().max(1000).default(""),
    ctaLabel: z.string().max(40).default(""),
    ctaDestination: z.string().max(120).default(""),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().default(true),
  }),
  bestSellerIds: z.array(z.string()).default([]),
  productTabs: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        icon: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .default([]),
  sectionOrder: z.array(z.string()).default([]),
});

export const storySchema = z.object({
  sections: z
    .array(
      z.object({
        heading: z.string().max(160).default(""),
        body: z.string().max(5000).default(""),
        imageUrl: z.string().url().optional().nullable(),
      }),
    )
    .min(1, "Add at least one section"),
});

export const reviewModerateSchema = z.object({
  visibility: z.enum(["visible", "hidden", "featured", "removed"]),
});

export const customerUpdateSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  photoURL: z.string().url().optional().nullable(),
});
