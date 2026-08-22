import { a as require_react, o as __toESM } from "../index.js";
//#region app/pwa-registration.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function PwaRegistration() {
	(0, import_react.useEffect)(() => {
		if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
		let registration = null;
		let reloading = false;
		const hadController = navigator.serviceWorker.controller !== null;
		const handleControllerChange = () => {
			if (!hadController || reloading) return;
			reloading = true;
			window.location.reload();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") registration?.update();
		};
		const register = () => {
			navigator.serviceWorker.register("/sw.js", {
				scope: "/",
				updateViaCache: "none"
			}).then((nextRegistration) => {
				registration = nextRegistration;
				return nextRegistration.update();
			}).catch(() => {});
		};
		navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		if (document.readyState === "complete") register();
		else window.addEventListener("load", register, { once: true });
		return () => {
			navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("load", register);
		};
	}, []);
	return null;
}
//#endregion
export { PwaRegistration };
