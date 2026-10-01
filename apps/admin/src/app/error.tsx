'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>This workspace needs a moment.</h1>
      <p>Your changes are safe. Please try loading the page again.</p>
      <button onClick={reset} className="button">
        Try again
      </button>
    </div>
  );
}
