"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type AnimationEvent, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { productImageUrl } from "@/features/catalog/products";

// Edit the homepage banners here. The slideshow advances on its own (see .hero-dot-fill in globals.css for the timing).
const slides = [
  {
    label: "Made for your every day",
    image: "photo-1611652022419-a9419f74343d",
    alt: "A delicate gold chain necklace resting at the collarbone",
    position: "center 43%",
    shade: "soft",
    eyebrow: "Made for your every day",
    title: ["A little shine.", "A lot of you."],
    text: "Thoughtful pieces with a lasting glow. Meet the jewellery you’ll reach for every morning.",
    cta: { label: "Find your everyday", href: "/shop" },
  },
  {
    label: "The earring edit",
    image: "photo-1535632066927-ab7c9ab60908",
    alt: "Sparkling blue-stone earrings resting on a green leaf",
    position: "center 40%",
    shade: "strong", // a busy, bright photo, so the text needs more contrast
    eyebrow: "The earring edit",
    title: ["Light on the ear.", "Bold in spirit."],
    text: "Hoops, drops and studs made for all-day wear, with a finish that stays beautiful.",
    cta: { label: "Shop earrings", href: "/shop?category=earrings" },
  },
  {
    label: "Stack and layer",
    image: "photo-1611591437281-460bfbe1220a",
    alt: "Delicate gold bracelets on a soft pink background",
    position: "center 50%",
    shade: "soft",
    eyebrow: "Stack and layer",
    title: ["Wear it your way.", "Stack it, layer it."],
    text: "Fine chains and little charms that look lovely alone and even better together.",
    cta: { label: "Shop bracelets", href: "/shop?category=bracelets" },
  },
  {
    label: "A treat for your first order",
    image: "photo-1605100804763-247f67b3557e",
    alt: "A sparkling stone ring on a dark backdrop",
    position: "center 45%",
    shade: "soft",
    eyebrow: "A little welcome",
    title: ["A treat for", "your first order."],
    text: "Use code UNIQUE10 for 10% off orders above ₹999 (up to ₹500 off).",
    cta: { label: "Start shopping", href: "/shop" },
  },
] as const;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  // Only the current slide and the one after it load their photo up front; others load as they come into play.
  const [loaded, setLoaded] = useState<number[]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = (target: number) => {
    const slide = ((target % count) + count) % count;
    setIndex(slide);
    setLoaded((current) => [...new Set([...current, slide, (slide + 1) % count])]);
  };
  const next = () => go(index + 1);
  const previous = () => go(index - 1);

  // The progress line under the active dot is a CSS animation, and finishing it moves to the next slide.
  // Pausing (hover, keyboard focus, the Pause button) pauses the animation, and reduced-motion users get no animation, so no auto-advance.
  const onProgressEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.animationName === "heroProgress") next();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
  };

  // Swipe on touch screens. Vertical scrolling is left to the browser (touch-action: pan-y).
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    touchStartX.current = event.pointerType === "mouse" ? null : event.clientX;
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) > 50) (distance < 0 ? next : previous)();
  };

  return <section
    className={`hero${paused ? " is-paused" : ""}`}
    aria-roledescription="carousel"
    aria-label="Featured collections"
    onKeyDown={onKeyDown}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={() => { touchStartX.current = null; }}
  >
    <div className="hero-track" aria-live={paused ? "polite" : "off"}>
      {slides.map((slide, i) => {
        const active = i === index;
        const Title = i === 0 ? "h1" : "h2"; // one h1 per page
        return <div
          key={slide.label}
          className={`hero-slide${active ? " is-active" : ""}${slide.shade === "strong" ? " is-strong" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${count}`}
          inert={!active}
        >
          {loaded.includes(i) && <Image className="hero-img" src={productImageUrl(slide.image, 2000)} alt={slide.alt} fill sizes="100vw" quality={80} priority={i === 0} style={{ objectPosition: slide.position }}/>}
          <div className="hero-copy">
            <span className="eyebrow">{slide.eyebrow}</span>
            <Title className="serif hero-title">{slide.title[0]}<br/><em>{slide.title[1]}</em></Title>
            <p>{slide.text}</p>
            <Link className="button" href={slide.cta.href}>{slide.cta.label}</Link>
          </div>
        </div>;
      })}
    </div>

    <div className="hero-controls">
      <div className="hero-dots" role="group" aria-label="Choose a slide">
        {slides.map((slide, i) => <button
          key={slide.label}
          type="button"
          className={`hero-dot${i === index ? " is-active" : ""}`}
          aria-label={`Go to slide ${i + 1}: ${slide.label}`}
          aria-current={i === index ? "true" : undefined}
          onClick={() => go(i)}
        >{i === index && <span className="hero-dot-fill" onAnimationEnd={onProgressEnd}/>}</button>)}
      </div>
      <div className="hero-buttons">
        <button type="button" aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={15} aria-hidden="true"/> : <Pause size={15} aria-hidden="true"/>}</button>
        <button type="button" aria-label="Previous slide" onClick={previous}><ChevronLeft size={18} aria-hidden="true"/></button>
        <button type="button" aria-label="Next slide" onClick={next}><ChevronRight size={18} aria-hidden="true"/></button>
      </div>
    </div>
  </section>;
}
