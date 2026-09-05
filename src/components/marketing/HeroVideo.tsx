"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

/**
 * YouTube hero video with a click-to-load facade: nothing is requested from
 * YouTube (no cookies, no third-party scripts) until the visitor presses play.
 * When no video ID is configured the slot renders as an empty framed panel at
 * the exact same aspect ratio, so the layout never shifts once you add one.
 */
export function HeroVideo({
  videoId,
  title,
  className,
}: {
  videoId: string | null;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  return (
    <div className={clsx("relative", className)}>
      {/* Warm glow behind the frame */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-flare-500/25 via-gold-500/10 to-transparent blur-3xl"
      />

      <div className="card-lg relative overflow-hidden p-2 sm:p-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-card bg-night-1000">
          {videoId && playing ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : videoId ? (
            <>
              {!posterFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
                  alt=""
                  onError={() => setPosterFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              ) : null}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-night-1000 via-night-1000/55 to-transparent"
              />
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4"
                aria-label={`Play video: ${title}`}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-flare-500 text-night-1000 shadow-flare transition duration-300 group-hover:scale-110 group-hover:bg-flare-400 sm:h-20 sm:w-20">
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                </span>
                <span className="rounded-pill border border-line bg-night-950/80 px-4 py-1.5 text-xs font-semibold text-mist backdrop-blur">
                  Watch the platform tour
                </span>
              </button>
            </>
          ) : (
            <EmptyVideoSlot title={title} />
          )}
        </div>
      </div>

      {/* Floating accent card */}
      {videoId ? (
        <div className="pointer-events-none absolute -bottom-5 left-6 hidden rounded-2xl border border-line bg-night-900/95 px-4 py-3 shadow-card backdrop-blur sm:block animate-float">
          <p className="text-[10px] font-bold tracking-[0.18em] text-fog uppercase">Now showing</p>
          <p className="mt-0.5 max-w-[15rem] truncate text-sm font-semibold text-chalk">{title}</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyVideoSlot({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,122,24,0.12),transparent_60%)] px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-line-strong text-fog">
          <Play className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-mist">Hero video slot</p>
        <p className="max-w-xs text-xs leading-relaxed text-smoke">
          Set <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-flare-300">NEXT_PUBLIC_YOUTUBE_VIDEO_ID</code>{" "}
          to load “{title}” here.
        </p>
      </div>
    </div>
  );
}
