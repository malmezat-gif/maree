import { a as require_react, o as __toESM } from "../index.js";
//#region app/viewport-fit.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
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
function ViewportFit() {
	(0, import_react.useEffect)(() => {
		const root = document.documentElement;
		const apply = () => {
			const viewport = window.visualViewport;
			const height = Math.max(window.innerHeight || 0, viewport ? Math.round(viewport.height + viewport.offsetTop) : 0);
			if (height > 0) root.style.setProperty("--app-height", `${height}px`);
			const declared = parseFloat(getComputedStyle(root).getPropertyValue("--sa-top-native") || "0");
			const offset = viewport ? Math.round(viewport.offsetTop) : 0;
			root.style.setProperty("--sa-top", declared > 0 ? `${declared}px` : `${Math.max(offset, 0)}px`);
		};
		apply();
		const settle = [
			window.setTimeout(apply, 120),
			window.setTimeout(apply, 600),
			window.setTimeout(apply, 1500)
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
//#endregion
export { ViewportFit };
