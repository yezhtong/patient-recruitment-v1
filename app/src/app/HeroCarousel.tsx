"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type HeroSlide = {
  id: string;
  url: string;
  note: string | null;
  overlayLabel: string | null;
  overlayText: string | null;
};

const FALLBACK_OVERLAY_LABEL = "真实研究中心";
const FALLBACK_OVERLAY_TEXT = "北京协和医院 · 乳腺肿瘤门诊";
const AUTOPLAY_INTERVAL = 4000;
const MANUAL_PAUSE_DURATION = 10000;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ── Single slide overlay ──────────────────────────────────────────── */
function SlideOverlay({
  label,
  text,
}: {
  label: string | null;
  text: string | null;
}) {
  if (!label && !text) return null;
  return (
    <div className="hero-photo__overlay">
      {label && <div className="hero-photo__overlay-label">{label}</div>}
      {text && <div className="hero-photo__overlay-text">{text}</div>}
    </div>
  );
}

/* ── 0-slide fallback ──────────────────────────────────────────────── */
function FallbackHero({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="hero-photo">
      <img
        src={src}
        alt={alt}
        loading="eager"
        width={900}
        height={1100}
      />
      <div className="hero-photo__overlay">
        <div className="hero-photo__overlay-label">{FALLBACK_OVERLAY_LABEL}</div>
        <div className="hero-photo__overlay-text">{FALLBACK_OVERLAY_TEXT}</div>
      </div>
    </figure>
  );
}

/* ── Single-image (1 slide) ────────────────────────────────────────── */
function SingleHero({ slide }: { slide: HeroSlide }) {
  return (
    <figure className="hero-photo">
      <img
        src={slide.url}
        alt={slide.note ?? "首页主视觉图片"}
        loading="eager"
        width={900}
        height={1100}
      />
      <SlideOverlay label={slide.overlayLabel} text={slide.overlayText} />
    </figure>
  );
}

/* ── Carousel arrow SVGs ────────────────────────────────────────────── */
function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ── Main carousel (≥2 slides) ─────────────────────────────────────── */
function MultiHero({ slides }: { slides: HeroSlide[] }) {
  const total = slides.length;
  const [active, setActive] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [ariaLive, setAriaLive] = useState<"off" | "polite">("off");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manualPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  /* pre-load non-first images once mounted */
  useEffect(() => {
    slides.slice(1).forEach((s) => {
      const img = new Image();
      img.src = s.url;
    });
  }, [slides]);

  /* pause when page hidden */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setAutoPlay(false);
      } else {
        setAutoPlay(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  /* autoplay timer */
  useEffect(() => {
    if (!autoPlay || reducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, AUTOPLAY_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, reducedMotion, total]);

  const goTo = useCallback(
    (index: number, manual = false) => {
      setActive(index);
      if (manual) {
        /* announce via aria-live for manual navigation */
        setAriaLive("polite");
        setTimeout(() => setAriaLive("off"), 1000);

        /* pause for 10s after manual interaction */
        if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
        setAutoPlay(false);
        manualPauseTimer.current = setTimeout(() => {
          setAutoPlay(true);
        }, MANUAL_PAUSE_DURATION);
      }
    },
    [],
  );

  const goPrev = useCallback(
    () => goTo((active - 1 + total) % total, true),
    [active, total, goTo],
  );

  const goNext = useCallback(
    () => goTo((active + 1) % total, true),
    [active, total, goTo],
  );

  /* keyboard navigation */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0, true);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total - 1, true);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, goTo, total]);

  /* hover / focus-within pause — handled via CSS + mouseenter/mouseleave on container */
  const handleMouseEnter = useCallback(() => setAutoPlay(false), []);
  const handleMouseLeave = useCallback(() => {
    /* only restore if no manual pause is active */
    if (!manualPauseTimer.current) setAutoPlay(true);
  }, []);
  const handleFocus = useCallback(() => setAutoPlay(false), []);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      if (!manualPauseTimer.current) setAutoPlay(true);
    }
  }, []);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero-carousel"
      role="region"
      aria-roledescription="轮播图"
      aria-label="首页主图"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* slides viewport */}
      <div
        className="hero-carousel__viewport"
        aria-live={ariaLive}
        aria-atomic="false"
      >
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={slide.id}
              className={`hero-carousel__slide${isActive ? " hero-carousel__slide--active" : " hero-carousel__slide--inactive"}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`第 ${i + 1} 张，共 ${total} 张`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.url}
                alt={slide.note ?? `轮播图第 ${i + 1} 张`}
                loading={i === 0 ? "eager" : "lazy"}
                width={900}
                height={1100}
              />
              <SlideOverlay label={slide.overlayLabel} text={slide.overlayText} />
            </div>
          );
        })}
      </div>

      {/* prev arrow */}
      <button
        className="hero-carousel__arrow hero-carousel__arrow--prev"
        aria-label="上一张"
        onClick={goPrev}
        tabIndex={0}
      >
        <ChevronLeft />
      </button>

      {/* next arrow */}
      <button
        className="hero-carousel__arrow hero-carousel__arrow--next"
        aria-label="下一张"
        onClick={goNext}
        tabIndex={0}
      >
        <ChevronRight />
      </button>

      {/* dot indicators */}
      <div
        className="hero-carousel__dots"
        role="tablist"
        aria-label="选择轮播图"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            role="tab"
            className={`hero-carousel__dot${i === active ? " hero-carousel__dot--active" : ""}`}
            aria-label={`第 ${i + 1} 张，共 ${total} 张`}
            aria-selected={i === active}
            onClick={() => goTo(i, true)}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Public export ─────────────────────────────────────────────────── */
export function HeroCarousel({
  slides,
  fallbackSrc,
  fallbackAlt,
}: {
  slides: HeroSlide[];
  fallbackSrc: string;
  fallbackAlt: string;
}) {
  if (slides.length === 0) {
    return <FallbackHero src={fallbackSrc} alt={fallbackAlt} />;
  }
  if (slides.length === 1) {
    return <SingleHero slide={slides[0]} />;
  }
  return <MultiHero slides={slides} />;
}
