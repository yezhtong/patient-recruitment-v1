"use client";
import { useState } from "react";

type Props = {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
};

export function SmartImage({
  src,
  fallbackSrc,
  alt,
  className,
  style,
  width,
  height,
  loading,
}: Props) {
  const [errored, setErrored] = useState(false);
  return (
    <img
      src={errored ? fallbackSrc : src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading={loading}
      onError={() => setErrored(true)}
    />
  );
}
