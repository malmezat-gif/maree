"use client";

import { useEffect } from "react";

/**
 * Sizes the app to the window the device actually has, rather than to the one
 * it reports.
 *
 * Measured on an installed iPhone 15 Pro Max: outerHeight 932 on a 932pt screen
 * — the window is the whole display — while innerHeight, visualViewport.height
 * and clientHeight all came back 873, and the page sat scrolled down by the
 * missing 59 with visualViewport.offsetTop at 59 to match. Anything sized in
 * viewport units, percentages or svh inherits the short number and ends 59px
 * above the bottom of the display, which is the band.
 *
 * Three attempts were made to fix the cause first — putting viewport-fit=cover
 * in the response, then removing the script that mutated the tag afterwards —
 * and the numbers did not move. So this stops asking why and works from the
 * arithmetic that is true on the device: height + offsetTop is the window, and
 * where nothing is wrong offsetTop is 0 and the sum is just innerHeight. The
 * same expression is correct on a phone with the problem and on a desktop
 * browser without it, so there is no platform test here and nothing to keep in
 * step with iOS.
 *
 * Everything that used to be 100svh reads --app-height instead; the fallback
 * keeps the layout sane for the moment before this runs and if it never does.
 */
export function ViewportFit() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const viewport = window.visualViewport;

      // height + offsetTop is the window on a device that misreports, and plain
      // innerHeight everywhere else, where offsetTop is 0. The max of the two
      // is right in both cases and never overshoots.
      //
      // outerHeight looks like the obvious answer — it read 932 on the device
      // throughout — and is not usable: in a desktop browser it includes the
      // chrome, and inside an iframe it reports the top-level window, so it
      // would stretch the app past the viewport everywhere except the one
      // device it was right about. Measured in the test rig: 959 against an
      // 836 innerHeight.
      //
      // The first version of this reset the scroll to 0 after measuring. That
      // sets offsetTop to 0, which fires visualViewport's scroll event, which
      // runs this again and computes 873 + 0: the measurement destroyed what it
      // was measuring, the app came back short, and the band moved from the
      // bottom of the screen to the top. The scroll is left alone now.
      const height = Math.max(
        window.innerHeight || 0,
        viewport ? Math.round(viewport.height + viewport.offsetTop) : 0,
      );

      if (height > 0) root.style.setProperty("--app-height", `${height}px`);

      // The same offset is the top inset. This device reports
      // env(safe-area-inset-top) as 0 while placing 59pt of status bar and
      // Dynamic Island over the app, so now that the app covers the whole
      // display there is nothing keeping the header out from under them.
      // offsetTop is that strip, measured rather than assumed.
      //
      // Only when env() has nothing to say: where the insets work they are the
      // device's own word and better than any arithmetic, so they win.
      const declared = parseFloat(
        getComputedStyle(root).getPropertyValue("--sa-top-native") || "0",
      );
      const offset = viewport ? Math.round(viewport.offsetTop) : 0;
      root.style.setProperty(
        "--sa-top",
        declared > 0 ? `${declared}px` : `${Math.max(offset, 0)}px`,
      );

      // The scroll is deliberately left alone. iOS puts the page 59px down and
      // keeps the app's box at -59; with the box only 873 tall that left the
      // last 118px of the display uncovered, which is where the band came from.
      // At the full 932 the same offset lands the box across the whole screen,
      // so the offset is not the problem and undoing it only moves the gap to
      // the top.
    };

    apply();

    // An installed app settles after launch — the status bar resolves, the
    // splash clears — and the first reading is taken before that. These are
    // cheap and idempotent.
    const settle = [
      window.setTimeout(apply, 120),
      window.setTimeout(apply, 600),
      window.setTimeout(apply, 1500),
    ];

    const viewport = window.visualViewport;
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    window.addEventListener("pageshow", apply);
    document.addEventListener("visibilitychange", apply);
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);

    return () => {
      settle.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.removeEventListener("pageshow", apply);
      document.removeEventListener("visibilitychange", apply);
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
    };
  }, []);

  return null;
}
