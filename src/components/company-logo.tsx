"use client";

import * as React from "react";
import { env } from "@/env";
import { cn } from "@/lib/utils";

type Stage = "logo-dev" | "google" | "initials";

type CompanyLogoProps = {
  company: string;
  domain?: string | null;
  size?: number;
  className?: string;
};

function computeInitials(company: string): string {
  return company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function initialStage(domain: string | null | undefined): Stage {
  if (!domain) return "initials";
  if (env.NEXT_PUBLIC_LOGO_DEV_TOKEN) return "logo-dev";
  return "google";
}

export function CompanyLogo({
  company,
  domain,
  size = 40,
  className,
}: CompanyLogoProps) {
  const [stage, setStage] = React.useState<Stage>(() => initialStage(domain));

  React.useEffect(() => {
    setStage(initialStage(domain));
  }, [domain]);

  const initials = computeInitials(company);

  const wrapperStyle = { width: size, height: size } as const;
  const wrapperClass = cn(
    "flex items-center justify-center bg-muted shrink-0 overflow-hidden",
    className,
  );

  if (stage === "initials" || !domain) {
    return (
      <div
        style={wrapperStyle}
        className={cn(
          wrapperClass,
          "text-xs font-semibold text-muted-foreground",
        )}
      >
        {initials}
      </div>
    );
  }

  const src =
    stage === "logo-dev"
      ? `https://img.logo.dev/${domain}?token=${env.NEXT_PUBLIC_LOGO_DEV_TOKEN}&size=${size * 2}&format=png`
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <div style={wrapperStyle} className={wrapperClass}>
      <img
        src={src}
        alt={company}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-contain"
        onError={() => {
          setStage((prev) => (prev === "logo-dev" ? "google" : "initials"));
        }}
      />
    </div>
  );
}
