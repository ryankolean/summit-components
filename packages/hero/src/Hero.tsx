import { assertSafeHref, type HeroCta, type HeroImage, type HeroProps } from "./types.js";

function Cta({ link, variant }: { link: HeroCta; variant: "primary" | "secondary" }) {
  return (
    <a className={`summit-hero__cta summit-hero__cta--${variant}`} href={assertSafeHref(link.href)}>
      {link.label}
    </a>
  );
}

function Media({ image }: { image: HeroImage }) {
  const img = (
    <img
      className="summit-hero__media"
      src={image.src}
      srcSet={image.srcset}
      sizes={image.sizes}
      alt={image.alt}
      width={image.width}
      height={image.height}
      decoding="async"
      fetchPriority={image.fetchpriority}
    />
  );
  if (!image.sources?.length) return img;
  return (
    <picture className="summit-hero__picture">
      {image.sources.map((s) => (
        <source key={`${s.type} ${s.srcset}`} type={s.type} srcSet={s.srcset} sizes={s.sizes ?? image.sizes} />
      ))}
      {img}
    </picture>
  );
}

/**
 * Server-rendered hero with no client JavaScript. Its markup must stay identical
 * to renderHero(); test/hero.test.tsx enforces that.
 */
export function Hero(props: HeroProps) {
  const { id = "hero", headingLevel = 1, align = "start", layout = "split", eyebrow, title, lede, image } = props;
  const Heading = headingLevel === 2 ? "h2" : "h1";
  const classes = ["summit-hero", `summit-hero--${align}`];
  if (image) classes.push("summit-hero--with-media");
  if (layout === "stacked") classes.push("summit-hero--stacked");

  return (
    <section className={classes.join(" ")} aria-labelledby={`${id}-title`}>
      <div className="summit-hero__body">
        {eyebrow && <p className="summit-hero__eyebrow">{eyebrow}</p>}
        <Heading id={`${id}-title`} className="summit-hero__title">
          {title}
        </Heading>
        {lede && <p className="summit-hero__lede">{lede}</p>}
        {(props.primaryCta || props.secondaryCta) && (
          <div className="summit-hero__actions">
            {props.primaryCta && <Cta link={props.primaryCta} variant="primary" />}
            {props.secondaryCta && <Cta link={props.secondaryCta} variant="secondary" />}
          </div>
        )}
      </div>
      {image && <Media image={image} />}
    </section>
  );
}
