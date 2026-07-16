"use client";

import { useEffect, useMemo, useState } from "react";

const PHOTOS = [
  "/team/login-1.jpg",
  "/team/login-2.jpg",
  "/team/login-3.jpg",
  "/team/login-4.jpg",
  "/team/login-5.jpg",
];

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** Full-bleed rotating team photos — same set as brandastic.co login */
export function LoginCarousel() {
  const photos = useMemo(() => shuffle(PHOTOS), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [photos.length]);

  return (
    <div className="login-carousel" aria-hidden>
      {photos.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={i === index ? "is-active" : ""}
        />
      ))}
      <div className="login-carousel-shade" />
      <div className="login-carousel-copy">
        <h2>Where creativity meets results</h2>
        <p>
          Priority inbox, branded client reports, and AI recommendations —
          built for Brandastic reviews.
        </p>
      </div>
    </div>
  );
}
