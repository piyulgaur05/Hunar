import { PrismaClient, OrderStatus } from '@prisma/client';
import { scryptSync, randomBytes, createHash } from 'node:crypto';
const db = new PrismaClient();
const photo = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const photos = {
  pottery: photo('photo-1578749556568-bc2c40e68b61'),
  ceramics: photo('photo-1490312278390-ab64016e0aa9'),
  home: photo('photo-1600210492486-724fe5c67fb0'),
  linen: photo('photo-1600166898405-da9535204843'),
  jewelry: photo('photo-1611652022419-a9419f74343d'),
  candle: photo('photo-1603006905003-be475563bc59'),
  basket: photo('photo-1594732832278-abd644401426'),
  gift: photo('photo-1549465220-1a8b9238cd48'),
  hero: photo('photo-1600210492486-724fe5c67fb0', 2000),
};
const categoryData = [
  ['Ceramics', 'ceramics', 'Objects shaped by hand, for everyday rituals.', photos.pottery],
  ['Home & Living', 'home-living', 'A slower, more beautiful way to be at home.', photos.home],
  ['Jewelry', 'jewelry', 'Small heirlooms with a story to tell.', photos.jewelry],
  ['Textiles', 'textiles', 'Natural threads. Extraordinary hands.', photos.linen],
  ['Candles & Fragrance', 'candles', 'Set the mood for a meaningful moment.', photos.candle],
  ['Personalized Gifts', 'personalized', 'Something only you could have given.', photos.gift],
  ['Baskets & Wood', 'baskets-wood', 'Honest materials, thoughtfully woven.', photos.basket],
  ['Festive & Wedding', 'festive', 'Celebrate beautifully, give thoughtfully.', photos.gift],
];
const entries: [string, string, number, number, string][] = [
  ['The Everyday Mug', 'Wheel-thrown stoneware', 890, 0, photos.pottery],
  ['Earth & Sky Vase', 'Hand-finished ceramic', 1850, 0, photos.ceramics],
  ['Sunday Breakfast Bowl', 'Glazed stoneware', 740, 0, photos.pottery],
  ['The Still Life Pitcher', 'Sculptural terracotta', 2450, 0, photos.ceramics],
  ['The Quiet Corner Vase', 'Organic stoneware', 2290, 1, photos.ceramics],
  ['Sienna Table Lamp', 'Handmade ceramic base', 4850, 1, photos.home],
  ['Brass Petal Dish', 'Hand-beaten brass', 1290, 1, photos.jewelry],
  ['Desert Arch Bookends', 'Carved sandstone pair', 2690, 1, photos.home],
  ['Moonrise Hoops', 'Hammered brass, gold finish', 1490, 2, photos.jewelry],
  ['The Kaveri Necklace', 'Freshwater pearls', 2850, 2, photos.jewelry],
  ['Petal Stud Earrings', 'Hand-cast silver', 1950, 2, photos.jewelry],
  ['The Everyday Cuff', 'Brushed brass', 1190, 2, photos.jewelry],
  ['Indigo Garden Cushion', 'Hand-block printed cotton', 1290, 3, photos.linen],
  ['Slow Sunday Throw', 'Handwoven organic cotton', 3290, 3, photos.linen],
  ['Sundown Table Runner', 'Natural linen', 1890, 3, photos.linen],
  ['Everyday Linen Napkins', 'Set of four', 1490, 3, photos.linen],
  ['A Little Stillness', 'Sandalwood soy candle', 990, 4, photos.candle],
  ['Rain on Earth', 'Petrichor fragrance candle', 1190, 4, photos.candle],
  ['Golden Hour Incense', 'Natural botanical blend', 690, 4, photos.candle],
  ['The Evening Ritual', 'Candle and ceramic holder', 1890, 4, photos.candle],
  ['Your Words, Forever', 'Personalized keepsake box', 2490, 5, photos.gift],
  ['The Storybook Journal', 'Hand-bound cotton paper', 1290, 5, photos.gift],
  ['A Name to Remember', 'Personalized ceramic mug', 1190, 5, photos.pottery],
  ['Little Love Letters', 'Engraved brass token', 790, 5, photos.jewelry],
  ['The Market Basket', 'Handwoven natural cane', 1690, 6, photos.basket],
  ['A Place for Everything', 'Woven storage basket', 2290, 6, photos.basket],
  ['The Gathering Board', 'Sustainably sourced mango wood', 1890, 6, photos.home],
  ['Morning Ritual Tray', 'Hand-carved acacia', 1590, 6, photos.home],
  ['The Celebration Box', 'Curated artisan gift set', 3490, 7, photos.gift],
  ['Light & Love Diyas', 'Set of six terracotta lamps', 890, 7, photos.candle],
  ['The New Beginnings Set', 'A considered housewarming gift', 4290, 7, photos.gift],
  ['Together, Always', 'Wedding keepsake collection', 5490, 7, photos.gift],
];
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seed cannot run in production');
  const roles: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: [
      'products:read',
      'products:create',
      'products:update',
      'products:delete',
      'orders:read',
      'orders:update',
      'customers:read',
      'inventory:update',
      'content:update',
      'analytics:read',
      'media:create',
      'reviews:update',
      'promotions:update',
      'settings:update',
      'audit:read',
      'users:update',
    ],
    CATALOG_MANAGER: [
      'products:read',
      'products:create',
      'products:update',
      'inventory:update',
      'media:create',
    ],
    ORDER_MANAGER: ['orders:read', 'orders:update', 'customers:read'],
    CONTENT_MANAGER: ['content:update', 'media:create'],
    SUPPORT_AGENT: ['orders:read', 'customers:read', 'reviews:update'],
    ANALYST: ['analytics:read'],
  };
  for (const [name, keys] of Object.entries(roles)) {
    const role = await db.role.upsert({ where: { name }, update: {}, create: { name } });
    for (const key of keys) {
      const permission = await db.permission.upsert({ where: { key }, update: {}, create: { key } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  const salt = randomBytes(16).toString('hex');
  const hash = `${salt}:${scryptSync(process.env.SEED_ADMIN_PASSWORD || 'Crafted!Dev2026', salt, 64).toString('hex')}`;
  const admin = await db.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@mitti.local' },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL || 'admin@mitti.local',
      name: 'Aditi Sharma',
      passwordHash: hash,
      verifiedAt: new Date(),
    },
  });
  const role = await db.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  });
  const categories = [];
  for (const [name, slug, description, image] of categoryData)
    categories.push(
      await db.category.upsert({ where: { slug }, update: {}, create: { name, slug, description, image } }),
    );
  const collections = [];
  for (const [name, slug, description, image] of [
    [
      'Everyday Rituals',
      'everyday-rituals',
      'Little things that make ordinary days extraordinary.',
      photos.pottery,
    ],
    ['A Thoughtful Home', 'thoughtful-home', 'Pieces with presence. Spaces with soul.', photos.home],
    ['Just for You', 'personalized', 'Make it personal. Make it theirs.', photos.gift],
    ['Under ₹1,500', 'under-1500', 'Small gestures, lasting impressions.', photos.candle],
    ['The Wedding Edit', 'wedding-edit', 'For the beginning of a beautiful story.', photos.gift],
    ['Festive Gatherings', 'festive-gatherings', 'Bring a little more light to the table.', photos.linen],
  ])
    collections.push(
      await db.collection.upsert({ where: { slug }, update: {}, create: { name, slug, description, image } }),
    );
  const products = [];
  for (const [index, [title, subtitle, price, cat, image]] of entries.entries()) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-$/, '');
    const product = await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        title,
        slug,
        subtitle,
        description: `${title} is made slowly, with care and a respect for natural materials. ${subtitle}, finished by our partner artisan studio in small batches. Subtle variations in texture and form make each piece wonderfully its own. A thoughtful addition to your everyday, or a meaningful gift for someone you love.`,
        categoryId: categories[cat].id,
        status: 'PUBLISHED',
        artisan: ['Neer Pottery Studio', 'Studio Gulmohar', 'Aarohi Collective', 'The Loom House'][cat % 4],
        origin: ['Jaipur, Rajasthan', 'Bengaluru, Karnataka', 'Kutch, Gujarat', 'Channapatna, Karnataka'][
          cat % 4
        ],
        materials: [
          'Lead-free stoneware',
          'Natural materials and traditional finishes',
          'Responsibly sourced brass and silver',
          'Organic cotton and natural linen',
          'Natural soy wax and botanical oils',
          'Natural wood, paper and ceramic',
          'Cane and sustainably sourced wood',
          'Artisan-made natural materials',
        ][cat],
        care: 'Clean gently with a soft cloth. Keep away from harsh chemicals. Made to be loved and cared for.',
        dimensions:
          cat === 0
            ? '9 × 9 × 10 cm · 300 ml'
            : 'See the selected variant for sizing. Made by hand; slight variations are natural.',
        featured: index % 4 === 0,
        images: {
          create: [
            {
              url: image,
              alt: `${title}, handmade by ${['Neer Pottery Studio', 'Studio Gulmohar', 'Aarohi Collective', 'The Loom House'][cat % 4]}`,
              position: 0,
            },
          ],
        },
        variants: {
          create: [
            {
              sku: `MT-${1000 + index}-N`,
              name: 'Natural',
              price: price * 100,
              compareAtPrice: index % 3 === 0 ? (price + 200) * 100 : null,
              inventory: { create: { available: 12 + (index % 18) } },
            },
            {
              sku: `MT-${1000 + index}-T`,
              name: 'Terracotta',
              price: (price + 100) * 100,
              inventory: { create: { available: index % 5 === 0 ? 3 : 8 } },
            },
          ],
        },
        options: {
          create: { name: 'Finish', values: { create: [{ value: 'Natural' }, { value: 'Terracotta' }] } },
        },
        customizations:
          cat === 5
            ? {
                create: [
                  {
                    key: 'name',
                    label: 'A name or a few meaningful words',
                    type: 'text',
                    required: true,
                    maxLength: 30,
                    priceAdjustment: 0,
                  },
                  {
                    key: 'gift_message',
                    label: 'Your gift message',
                    type: 'textarea',
                    maxLength: 200,
                    priceAdjustment: 0,
                  },
                ],
              }
            : undefined,
        collections: {
          create: [
            { collectionId: collections[cat % 6].id },
            ...(price < 1500 && cat % 6 !== 3 ? [{ collectionId: collections[3].id }] : []),
          ],
        },
      },
    });
    products.push(product);
  }
  const names = [
    'Ananya Rao',
    'Rohan Mehta',
    'Meera Iyer',
    'Arjun Kapoor',
    'Kavya Nair',
    'Nikhil Shah',
    'Diya Patel',
    'Siddharth Sen',
    'Tara Menon',
    'Ishaan Desai',
  ];
  const users = [];
  for (const [i, name] of names.entries()) {
    const user = await db.user.upsert({
      where: { email: `${name.toLowerCase().replace(' ', '.')}@example.com` },
      update: {},
      create: {
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        passwordHash: hash,
        verifiedAt: new Date(),
        profile: { create: { preferences: { newsletter: false } } },
      },
    });
    users.push(user);
    await db.review.upsert({
      where: { userId_productId: { userId: user.id, productId: products[i % products.length].id } },
      update: {},
      create: {
        userId: user.id,
        productId: products[i % products.length].id,
        rating: i % 3 === 0 ? 4 : 5,
        title: ['A beautiful everyday ritual', 'Even lovelier in person', 'Such a thoughtful gift'][i % 3],
        body: 'Beautifully made, carefully packed, and full of character. You can feel the thought that went into every detail.',
        approved: true,
      },
    });
  }
  for (let i = 0; i < 20; i++) {
    const user = users[i % users.length],
      product = products[i % products.length];
    const variant = await db.productVariant.findFirstOrThrow({
      where: { productId: product.id },
      include: { product: { include: { images: true } } },
    });
    const status: OrderStatus = (['DELIVERED', 'PROCESSING', 'PACKED', 'SHIPPED', 'PAID'] as OrderStatus[])[
      i % 5
    ];
    const date = new Date(Date.now() - (19 - i) * 86400000);
    await db.order.upsert({
      where: { number: `MT-${260100 + i}` },
      update: {},
      create: {
        number: `MT-${260100 + i}`,
        userId: user.id,
        email: user.email,
        accessTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
        idempotencyKey: `seed-order-${i}`,
        requestHash: 'seed',
        status,
        subtotal: variant.price,
        shipping: 0,
        total: variant.price,
        createdAt: date,
        items: {
          create: {
            variantId: variant.id,
            productId: product.id,
            title: product.title,
            variantName: variant.name,
            image: variant.product.images[0].url,
            sku: variant.sku,
            quantity: 1,
            unitPrice: variant.price,
          },
        },
        addresses: {
          create: {
            name: user.name,
            phone: '9876543210',
            line1: '24, Garden Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
          },
        },
        events: {
          create: [
            { type: 'ORDER_CREATED', createdAt: date },
            { type: 'PAYMENT_RECEIVED', createdAt: date },
            { type: status, createdAt: date },
          ],
        },
        payments: {
          create: {
            provider: 'mock',
            providerOrderId: `seed_payment_${i}`,
            providerPaymentId: `seed_paid_${i}`,
            amount: variant.price,
            status: 'CAPTURED',
            createdAt: date,
          },
        },
      },
    });
  }
  await db.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', percent: 10, minimum: 100000, maxDiscount: 50000, maxUses: 1000 },
  });
  for (const section of [
    {
      type: 'hero',
      title: 'Where every craft\ntells a story.',
      position: 0,
      content: {
        eyebrow: 'HUNARÉ · HANDCRAFTED IN INDIA',
        description:
          'Beautiful things, with a human touch. Discover handcrafted pieces for the everyday and the extraordinary, each carrying the story of the hands that made it.',
        image: photos.hero,
        cta: 'Begin the story',
        href: '/shop',
        note: 'THE ART OF SLOW LIVING',
        caption: 'Objects with a story. A home with soul.',
      },
    },
    {
      type: 'collections',
      title: 'A little something,\nfor every kind of love.',
      position: 1,
      content: {
        eyebrow: 'THE CONSIDERED COLLECTION',
        description: 'For your favourite people. And your favourite corners.',
      },
    },
    {
      type: 'bestsellers',
      title: 'Loved for a reason.',
      position: 2,
      content: {
        eyebrow: 'THE PIECES YOU COME BACK TO',
        description: 'Small-batch favourites, made to become part of your story.',
      },
    },
    {
      type: 'story',
      title: 'Behind every piece,\na pair of hands.',
      position: 3,
      content: {
        eyebrow: 'EVERY PIECE BEGINS WITH A PAIR OF HANDS',
        description:
          'A potter in Jaipur. A weaver in Kutch. A woodworker in Channapatna. We bring together independent Indian artisans who believe, as we do, that beautiful things take time.',
        image: photos.pottery,
        cta: 'Meet the makers',
        href: '/our-story',
      },
    },
    {
      type: 'testimonials',
      title: 'A few words, from the heart.',
      position: 4,
      content: {
        quote:
          'The kind of gift that says “I really thought about you.” Every little detail, from the handmade mug to the wrapping, felt so personal.',
        author: 'Ananya R. · Bengaluru',
      },
    },
    {
      type: 'newsletter',
      title: 'A little inspiration,\ndelivered slowly.',
      position: 5,
      content: {
        description:
          'New collections, stories from our makers, and thoughtful things worth sharing. A letter, every now and then.',
      },
    },
  ])
    await db.homepageSection.upsert({ where: { type: section.type }, update: {}, create: section });
  await db.siteSetting.upsert({
    where: { key: 'announcement' },
    update: {},
    create: {
      key: 'announcement',
      value: 'Every piece, a story worth keeping · Complimentary shipping on orders above ₹2,500',
    },
  });
  await db.navigationMenu.upsert({
    where: { location: 'main' },
    update: {},
    create: {
      location: 'main',
      items: [
        { label: 'Shop all', href: '/shop' },
        { label: 'Collections', href: '/collections' },
        { label: 'The gift edit', href: '/shop?category=personalized' },
        { label: 'Our story', href: '/our-story' },
        { label: 'Journal', href: '/journal' },
      ],
    },
  });
  console.log('Seed complete: 32 products, 8 categories, 6 collections, 10 customers, 20 orders.');
}
main().finally(() => db.$disconnect());
