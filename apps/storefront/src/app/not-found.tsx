import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="page-error">
      <span className="eyebrow">404 · A LITTLE LOST</span>
      <h1>This path has wandered.</h1>
      <p>There are still beautiful things waiting to be found.</p>
      <Link href="/shop" className="button">
        Back to the collection
      </Link>
    </section>
  );
}
