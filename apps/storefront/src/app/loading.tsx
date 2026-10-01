export default function Loading() {
  return (
    <div className="section" aria-label="Loading the shop">
      <div className="skeleton" style={{ height: 65, width: '45%', marginBottom: 30 }} />
      <div className="product-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton" key={n} style={{ aspectRatio: '4/5' }} />
        ))}
      </div>
    </div>
  );
}
