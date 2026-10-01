import Link from 'next/link';
export const BRAND_NAME = 'Hunaré';
export const BRAND_TAGLINE = 'Where Every Craft Tells a Story.';
/** The brand name with its accented "é" set apart, so it can be styled as the signature flourish. */
export function WordmarkText() {
  return (
    <span className="wordmark-name">
      Hunar<em>é</em>
    </span>
  );
}
export function Wordmark({ tagline = false, className = '' }: { tagline?: boolean; className?: string }) {
  return (
    <Link href="/" className={`wordmark ${className}`.trim()} aria-label={`${BRAND_NAME} home`}>
      <WordmarkText />
      {tagline && <span className="wordmark-tagline">Where every craft tells a story</span>}
    </Link>
  );
}
/** A slowly turning circular seal that carries the tagline — used as the brand's signature mark. */
export function Seal({ size = 96, className = '' }: { size?: number; className?: string }) {
  const id = `seal-${size}`;
  return (
    <span className={`seal ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <path id={id} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text fontSize="10.4" letterSpacing="1.9">
          <textPath href={`#${id}`}>WHERE EVERY CRAFT TELLS A STORY ✦ HUNARÉ ✦</textPath>
        </text>
      </svg>
      <span className="seal-core">H</span>
    </span>
  );
}
