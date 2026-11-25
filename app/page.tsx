import Link from "next/link";
import { PaymentSetupButton } from "../components/layout/AppShell";

const steps = [
  {
    title: "Read a free preview",
    description: "See what the story is about before you decide.",
  },
  {
    title: "Review the price",
    description: "Check the price and fees before confirming payment.",
  },
  {
    title: "Unlock the full story",
    description: "Keep reading as soon as payment is confirmed.",
  },
];

export default function HomePage() {
  return (
    <div className="explore-page home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <h1 id="home-hero-title">Discover independent stories.</h1>
          <p>
            Read a free preview. Unlock the full story when you find something
            worth reading.
          </p>
          <div className="home-hero-actions">
            <PaymentSetupButton demo />
          </div>
        </div>
        <div className="home-preview">
          <p className="eyebrow">EXAMPLE PREVIEW</p>
          <h2>The quiet art of keeping a field journal</h2>
          <p>
            A notebook slows you down just enough to notice what you usually
            walk past.
          </p>
          <div className="home-preview-lock">Full story locked</div>
        </div>
      </section>
      <section className="home-how" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How it works</h2>
        <ol className="home-steps" role="list">
          {steps.map(({ title, description }, index) => (
            <li key={title}>
              <span className="home-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="home-paths">
        <section>
          <h2>For readers</h2>
          <p>Find a new story or return to one you’ve already unlocked.</p>
          <div className="home-path-actions">
            <Link href="/explore">Browse stories</Link>
            <Link href="/library">My Library</Link>
          </div>
        </section>
        <section>
          <h2>For writers</h2>
          <p>Write a preview, set your price, and publish a premium story.</p>
          <Link className="button-link button-secondary" href="/seller">
            Start writing
          </Link>
        </section>
      </div>
    </div>
  );
}
