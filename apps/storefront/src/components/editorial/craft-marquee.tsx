/** An endless ribbon of crafts — the first thing that moves on the page. */
export function CraftMarquee({ items }: { items: string[] }) {
  const words = items.length ? items : ['Ceramics', 'Textiles', 'Jewellery', 'Wood', 'Brass', 'Candles'];
  const ribbon = [...words, ...words];
  return (
    <div className="craft-marquee" aria-label={`Crafts we carry: ${words.join(', ')}`}>
      <div className="craft-marquee-track">
        {ribbon.map((word, i) => (
          <span key={`${word}-${i}`} aria-hidden={i >= words.length}>
            {word}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
