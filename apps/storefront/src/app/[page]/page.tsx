import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
const pages: Record<
  string,
  { title: string; eyebrow: string; intro: string; sections: { title: string; body: string }[] }
> = {
  'our-story': {
    title: 'Good things have a human story.',
    eyebrow: 'THE HANDS. THE HEART. THE CRAFT.',
    intro:
      'Hunar means skill: the kind that lives in a pair of hands and is passed down, not written down. Our name is a small reminder of where beautiful things begin: honest materials and people who care.',
    sections: [
      {
        title: 'A more thoughtful way to make.',
        body: 'We work with independent artisan studios across India. Each studio brings its own knowledge of clay, cloth, metal, or wood. Together, we choose objects that feel as good to live with as they do to give.',
      },
      {
        title: 'Made slowly. Kept for years.',
        body: 'A curve that is not quite symmetrical. A glaze that catches the light a little differently. A stitch you can follow with your fingertips. These are the details that tell you something was made by a person.',
      },
      {
        title: 'From their hands, to your home.',
        body: 'Our collections are small and considered. We believe in everyday rituals, useful beauty, and gifts that say something personal. Every piece is an invitation to pause and notice.',
      },
    ],
  },
  journal: {
    title: 'Notes on a slower kind of living.',
    eyebrow: 'THE HUNARÉ JOURNAL',
    intro:
      'A few things we’ve been thinking about: the objects we keep, the gifts we give, and the small rituals that make a day our own.',
    sections: [
      {
        title: 'The everyday cup, reconsidered.',
        body: 'Some objects become part of our lives without asking for attention. The cup you reach for in the morning. The bowl that makes a simple meal feel considered. Choosing one made by hand gives these everyday moments a little more character.',
      },
      {
        title: 'A gift that feels like them.',
        body: 'Start with a small observation: a colour they wear, a ritual they love, a corner of their home. The most meaningful gifts often say “I noticed” rather than “I spent”. Add a few words in your own handwriting.',
      },
      {
        title: 'Caring for handmade things.',
        body: 'Natural materials respond to a little attention. Let wood dry fully after a gentle wipe. Keep brass away from strong cleaners. Wash handwoven cloth on a cool, gentle cycle. Small habits help beautiful things stay with you.',
      },
    ],
  },
  shipping: {
    title: 'Delivered with a little extra care.',
    eyebrow: 'SHIPPING & DELIVERY',
    intro:
      'Every order is packed thoughtfully, with protective materials chosen to help your handmade pieces arrive safely.',
    sections: [
      {
        title: 'Within India',
        body: 'Standard delivery takes approximately 5–8 working days after dispatch. Shipping is ₹99, with complimentary shipping on orders of ₹2,500 or more after discounts. Your final shipping charge appears before payment.',
      },
      {
        title: 'Made just for you',
        body: 'Personalized pieces may take longer to prepare. We will contact you if your order needs extra making time. Handmade items may ship in separate parcels when they come from different studios.',
      },
      {
        title: 'Following your order',
        body: 'Your order page shows its progress. A tracking number is added when it ships. Keep the order confirmation email and use the same browser for guest order access.',
      },
    ],
  },
  returns: {
    title: 'We want it to feel right.',
    eyebrow: 'RETURNS & CARE',
    intro:
      'If your piece arrives damaged or does not match what you ordered, get in touch within 7 days of delivery with your order number and photographs.',
    sections: [
      {
        title: 'A little variation is a good thing',
        body: 'Handmade pieces vary subtly in shape, colour, texture, and finish. These differences reflect the materials and the maker’s hand. They are part of what makes your piece your own.',
      },
      {
        title: 'Personalized pieces',
        body: 'Pieces made or engraved especially for you cannot be returned for a change of mind. We will help if your personalized order arrives damaged or has a making error.',
      },
      {
        title: 'Arranging a return',
        body: 'Contact our team before sending a piece back. Keep its protective packaging until you are happy with the order. Approved refunds are returned to the original payment method after inspection.',
      },
    ],
  },
  contact: {
    title: 'A note, a question, a hello.',
    eyebrow: 'WE’RE HERE TO HELP',
    intro:
      'For questions about a piece, help with an order, or a thoughtful gifting request, our team is here Monday–Saturday, 10 am–6 pm IST.',
    sections: [
      {
        title: 'Order support',
        body: 'Have your order number ready so we can help you quickly. Your account and order page include the latest order status, delivery address, and tracking details.',
      },
      {
        title: 'Personal and corporate gifting',
        body: 'Tell us a little about the occasion, the number of gifts, your budget, and when you need them. We’ll help you find a considered selection.',
      },
      {
        title: 'A development storefront',
        body: 'This local installation uses sample catalog and contact information. The merchant’s customer-support email and policies must be configured before accepting live orders.',
      },
    ],
  },
  privacy: {
    title: 'Your information, thoughtfully handled.',
    eyebrow: 'PRIVACY',
    intro:
      'We use the details you provide to manage your account, prepare orders, arrange delivery, and keep you informed about your purchases.',
    sections: [
      {
        title: 'Accounts and orders',
        body: 'Names, email addresses, shipping details, and order histories are stored so the shop can fulfill your requests. Passwords are hashed. Payment card details are handled by the selected payment provider and are not stored in this application.',
      },
      {
        title: 'Your choices',
        body: 'You can update your profile, saved addresses, and communication preferences in your account. Contact the merchant to request access, correction, or deletion of personal information, subject to required record retention.',
      },
      {
        title: 'Cookies',
        body: 'Essential cookies keep your session, shopping bag, and guest order access secure. They are not available to JavaScript. This development policy must be reviewed for the merchant’s actual operations before launch.',
      },
    ],
  },
  terms: {
    title: 'A few shared understandings.',
    eyebrow: 'TERMS OF PURCHASE',
    intro:
      'By placing an order, you agree to provide accurate contact and delivery details and to review your selected variants and personalization before payment.',
    sections: [
      {
        title: 'Pricing and availability',
        body: 'Prices are listed in Indian rupees and include applicable taxes. The server confirms current prices, discounts, shipping, and stock before payment. An order is confirmed after payment is securely verified.',
      },
      {
        title: 'Handmade character',
        body: 'Photographs show the style of a piece. Small variations are natural in handmade goods. Dimensions are approximate unless specifically stated.',
      },
      {
        title: 'Before a live launch',
        body: 'These are development policies, not a substitute for merchant-specific legal terms. The operator must add its registered business details, customer support contacts, return terms, tax information, and other applicable disclosures before launch.',
      },
    ],
  },
};
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return { title: pages[page]?.title || 'Page not found' };
}
export default async function EditorialPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = pages[page];
  if (!content) notFound();
  return (
    <article className="article-page">
      <span className="chapter">
        <b>{page === 'our-story' ? 'Story' : page === 'journal' ? 'Journal' : 'Notes'}</b>
        {content.eyebrow}
      </span>
      <h1>{content.title}</h1>
      <p>{content.intro}</p>
      {page === 'our-story' && (
        <div className="article-image">
          <Image
            src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=85"
            alt="Ceramics shaped and finished by hand"
            fill
            sizes="90vw"
          />
        </div>
      )}
      {content.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <Link href={page === 'shipping' || page === 'returns' ? '/contact' : '/shop'} className="button">
        {page === 'shipping' || page === 'returns' ? 'Get in touch' : 'Explore the collection'}
      </Link>
    </article>
  );
}
