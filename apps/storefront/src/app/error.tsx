'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page-error">
      <span className="eyebrow">A SMALL PAUSE</span>
      <h1>Good things take a moment.</h1>
      <p>We couldn’t load this page. Please try again shortly.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
