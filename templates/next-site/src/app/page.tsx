import type { Metadata } from "next";
import { Hero } from "@summit/hero";
import { absolute, baseOpenGraph, describeDays, entity, home } from "../lib/site";

export const metadata: Metadata = {
  title: home.title,
  alternates: { canonical: absolute("/") },
  openGraph: { ...baseOpenGraph, title: home.title, description: entity.description, url: absolute("/") },
};

export default function HomePage() {
  const location = entity.locations[0]!;
  const { address } = location;
  const addressLine = `${address.street}, ${address.locality}, ${address.region} ${address.postalCode}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;

  return (
    <>
      <Hero {...home.hero} />

      <section id="visit" className="site-section" aria-labelledby="visit-title">
        <h2 id="visit-title">Hours and location</h2>
        <dl className="site-hours">
          {location.hours.map((h) => (
            <div key={h.days.join()}>
              <dt>{describeDays(h.days)}</dt>
              <dd>
                {h.opens} to {h.closes}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          <a href={mapsUrl}>{addressLine}</a>
        </p>
        {entity.telephone && (
          <p>
            <a href={`tel:${entity.telephone}`}>{entity.telephone}</a>
          </p>
        )}
      </section>

      {entity.faq.length > 0 && (
        <section id="faq" className="site-section" aria-labelledby="faq-title">
          <h2 id="faq-title">Questions</h2>
          {entity.faq.map((f) => (
            <details key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
