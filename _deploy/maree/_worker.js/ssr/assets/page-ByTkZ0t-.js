import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region app/day-cycle.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function clamp$1(value, minimum = 0, maximum = 1) {
	return Math.max(minimum, Math.min(maximum, value));
}
function getDayCycle(minutes) {
	const normalized = (minutes % 1440 + 1440) % 1440;
	const sunProgress = clamp$1((normalized - 330) / 780);
	const sunAltitude = normalized >= 330 && normalized <= 1110 ? Math.sin(sunProgress * Math.PI) : 0;
	const dawn = Math.exp(-Math.pow((normalized - 390) / 95, 2));
	const dusk = Math.exp(-Math.pow((normalized - 1110) / 95, 2));
	const twilight = clamp$1(Math.max(dawn, dusk));
	const solar = clamp$1(sunAltitude * 3.2);
	const daylight = clamp$1(solar * .96 + twilight * .1);
	const night = clamp$1(1 - solar - twilight * .5);
	const moonProgress = clamp$1(((normalized < 1080 ? normalized + 1440 : normalized) - 1080) / 720);
	const moonlight = Math.sin(moonProgress * Math.PI) * night;
	let phase = "day";
	if (normalized < 300 || normalized >= 1200) phase = "night";
	else if (normalized < 450) phase = "dawn";
	else if (normalized >= 1020) phase = "dusk";
	return {
		phase,
		label: {
			night: "Nuit",
			dawn: "Aube",
			day: "Journée",
			dusk: "Crépuscule"
		}[phase],
		daylight,
		night,
		dawn,
		dusk,
		twilight,
		moonlight,
		sunX: 7 + sunProgress * 86,
		sunY: 42 - sunAltitude * 35,
		moonX: 8 + moonProgress * 84,
		moonY: 42 - Math.sin(moonProgress * Math.PI) * 32
	};
}
//#endregion
//#region app/shom-tide-widget.tsx
var import_jsx_runtime = require_jsx_runtime();
var SHOM_PORTS = {
	biarritz: {
		label: "Biarritz",
		code: "BOUCAU-BAYONNE"
	},
	"saint-jean-de-luz": {
		label: "Saint-Jean-de-Luz",
		code: "SOCOA"
	},
	capbreton: {
		label: "Capbreton",
		code: "CAPBRETON"
	},
	arcachon: {
		label: "Arcachon",
		code: "ARCACHON_EYRAC"
	},
	"la-rochelle": {
		label: "La Rochelle",
		code: "LA_ROCHELLE-PALLICE"
	},
	"les-sables": {
		label: "Les Sables-d’Olonne",
		code: "LES_SABLES_D_OLONNE"
	},
	brest: {
		label: "Brest",
		code: "BREST"
	},
	"saint-malo": {
		label: "Saint-Malo",
		code: "SAINT-MALO"
	}
};
var SHOM_WIDGET_ORIGIN = "https://services.data.shom.fr";
var SHOM_PORTAL_URL = "https://maree.shom.fr/";
var frameStyle = {
	display: "block",
	width: "100%",
	aspectRatio: "3 / 4",
	border: 0,
	borderRadius: 22,
	background: "#f7fafc"
};
var loadingStyle = {
	position: "absolute",
	inset: 0,
	display: "grid",
	placeItems: "center",
	padding: 24,
	borderRadius: 22,
	color: "#23445a",
	background: "linear-gradient(180deg, #f7fbfd 0%, #e6f2f6 100%)",
	fontSize: 14,
	textAlign: "center",
	pointerEvents: "none"
};
function buildShomWidgetDocument(portCode) {
	return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      iframe {
        display: block;
        width: 675px !important;
        height: 900px !important;
        border: 0 !important;
        transform-origin: top left;
      }
    </style>
  </head>
  <body>
    <script src="${`${SHOM_WIDGET_ORIGIN}/hdm/vignette/grande/${encodeURIComponent(portCode)}?locale=fr`}"><\/script>
    <script>
      (() => {
        const widgetFrame = document.querySelector("iframe");
        if (!widgetFrame) return;

        const fitWidget = () => {
          const scale = Math.min(1, window.innerWidth / 675);
          widgetFrame.style.transform = "scale(" + scale + ")";
        };

        fitWidget();
        window.addEventListener("resize", fitWidget, { passive: true });
      })();
    <\/script>
  </body>
</html>`;
}
function buildShomWidgetDataUrl(portCode) {
	return `data:text/html;charset=utf-8,${encodeURIComponent(buildShomWidgetDocument(portCode))}`;
}
function ShomTideWidget({ portId, className }) {
	const port = SHOM_PORTS[portId];
	const [loadedPortCode, setLoadedPortCode] = (0, import_react.useState)(null);
	const isLoaded = loadedPortCode === port.code;
	const title = `Horaires officiels des marées du SHOM — ${port.label}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className,
		"data-shom-port": port.code,
		"aria-busy": !isLoaded,
		style: {
			width: "100%",
			maxWidth: 675,
			margin: "0 auto"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				position: "relative",
				isolation: "isolate"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
				title,
				src: buildShomWidgetDataUrl(port.code),
				sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
				referrerPolicy: "strict-origin-when-cross-origin",
				loading: "lazy",
				onLoad: () => setLoadedPortCode(port.code),
				style: frameStyle
			}, port.code), !isLoaded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				role: "status",
				"aria-live": "polite",
				style: loadingStyle,
				children: [
					"Chargement des horaires officiels du SHOM pour ",
					port.label,
					"…"
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", {
			style: {
				marginTop: 10,
				color: "rgba(16, 43, 58, 0.68)",
				fontSize: 12,
				lineHeight: 1.4,
				textAlign: "center"
			},
			children: [
				"Horaires et coefficients officiels fournis par le",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: SHOM_PORTAL_URL,
					target: "_blank",
					rel: "noopener noreferrer",
					style: {
						color: "inherit",
						fontWeight: 700
					},
					children: "SHOM"
				}),
				"."
			]
		})]
	});
}
//#endregion
//#region node_modules/@neaps/tide-predictor/dist/index.js
var d2r = Math.PI / 180;
var r2d = 180 / Math.PI;
var sexagesimalToDecimal = (degrees, arcmins = 0, arcsecs = 0, mas = 0, muas = 0) => {
	return degrees + arcmins / 60 + arcsecs / 3600 + mas / (3600 * 1e3) + muas / (3600 * 1e6);
};
var coefficients = {
	terrestrialObliquity: [
		sexagesimalToDecimal(23, 26, 21.448),
		-sexagesimalToDecimal(0, 0, 4680.93),
		-sexagesimalToDecimal(0, 0, 1.55),
		sexagesimalToDecimal(0, 0, 1999.25),
		-sexagesimalToDecimal(0, 0, 51.38),
		-sexagesimalToDecimal(0, 0, 249.67),
		-sexagesimalToDecimal(0, 0, 39.05),
		sexagesimalToDecimal(0, 0, 7.12),
		sexagesimalToDecimal(0, 0, 27.87),
		sexagesimalToDecimal(0, 0, 5.79),
		sexagesimalToDecimal(0, 0, 2.45)
	].map((number, index) => {
		return number * Math.pow(.01, index);
	}),
	solarPerigee: [
		-77.06265000000002,
		1.7190199999968172,
		4591e-7,
		48e-8
	],
	solarLongitude: [
		280.46645,
		36000.76983,
		3032e-7
	],
	lunarInclination: [5.145],
	lunarLongitude: [
		218.3164591,
		481267.88134236,
		-.0013268,
		1 / 538841 - 1 / 65194e3
	],
	lunarNode: [
		125.044555,
		-1934.1361849,
		.0020762,
		1 / 467410,
		-1 / 60616e3
	],
	lunarPerigee: [
		83.353243,
		4069.0137111,
		-.0103238,
		-1 / 80053,
		1 / 18999e3
	]
};
var polynomial = (coefficients, argument) => {
	const result = [];
	coefficients.forEach((coefficient, index) => {
		result.push(coefficient * Math.pow(argument, index));
	});
	return result.reduce((a, b) => a + b);
};
var derivativePolynomial = (coefficients, argument) => {
	const result = [];
	coefficients.forEach((coefficient, index) => {
		result.push(coefficient * index * Math.pow(argument, index - 1));
	});
	return result.reduce((a, b) => a + b);
};
var T = (t) => {
	return (JD(t) - 2451545) / 36525;
};
var JD = (t) => {
	let Y = t.getUTCFullYear();
	let M = t.getUTCMonth() + 1;
	const D = t.getUTCDate() + t.getUTCHours() / 24 + t.getUTCMinutes() / 1440 + t.getUTCSeconds() / (1440 * 60) + t.getUTCMilliseconds() / (1440 * 60 * 1e3);
	if (M <= 2) {
		Y = Y - 1;
		M = M + 12;
	}
	const A = Math.floor(Y / 100);
	const B = 2 - A + Math.floor(A / 4);
	return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
};
var _I = (N, i, omega) => {
	N = d2r * N;
	i = d2r * i;
	omega = d2r * omega;
	const cosI = Math.cos(i) * Math.cos(omega) - Math.sin(i) * Math.sin(omega) * Math.cos(N);
	return r2d * Math.acos(cosI);
};
var _xi = (N, i, omega) => {
	N = d2r * N;
	i = d2r * i;
	omega = d2r * omega;
	let e1 = Math.cos(.5 * (omega - i)) / Math.cos(.5 * (omega + i)) * Math.tan(.5 * N);
	let e2 = Math.sin(.5 * (omega - i)) / Math.sin(.5 * (omega + i)) * Math.tan(.5 * N);
	e1 = Math.atan(e1);
	e2 = Math.atan(e2);
	e1 = e1 - .5 * N;
	e2 = e2 - .5 * N;
	return -(e1 + e2) * r2d;
};
var _nu = (N, i, omega) => {
	N = d2r * N;
	i = d2r * i;
	omega = d2r * omega;
	let e1 = Math.cos(.5 * (omega - i)) / Math.cos(.5 * (omega + i)) * Math.tan(.5 * N);
	let e2 = Math.sin(.5 * (omega - i)) / Math.sin(.5 * (omega + i)) * Math.tan(.5 * N);
	e1 = Math.atan(e1);
	e2 = Math.atan(e2);
	e1 = e1 - .5 * N;
	e2 = e2 - .5 * N;
	return (e1 - e2) * r2d;
};
var _nup = (N, i, omega) => {
	const I = d2r * _I(N, i, omega);
	const nu = d2r * _nu(N, i, omega);
	return r2d * Math.atan(Math.sin(2 * I) * Math.sin(nu) / (Math.sin(2 * I) * Math.cos(nu) + .3347));
};
var _nupp = (N, i, omega) => {
	const I = d2r * _I(N, i, omega);
	const nu = d2r * _nu(N, i, omega);
	const tan2nupp = Math.sin(I) ** 2 * Math.sin(2 * nu) / (Math.sin(I) ** 2 * Math.cos(2 * nu) + .0727);
	return r2d * .5 * Math.atan(tan2nupp);
};
var modulus = (a, b) => {
	return (a % b + b) % b;
};
var astro = (time) => {
	const result = {};
	const polynomials = {
		s: coefficients.lunarLongitude,
		h: coefficients.solarLongitude,
		p: coefficients.lunarPerigee,
		N: coefficients.lunarNode,
		pp: coefficients.solarPerigee,
		"90": [90],
		omega: coefficients.terrestrialObliquity,
		i: coefficients.lunarInclination
	};
	const dTdHour = 1 / (24 * 365.25 * 100);
	for (const name in polynomials) result[name] = {
		value: modulus(polynomial(polynomials[name], T(time)), 360),
		speed: derivativePolynomial(polynomials[name], T(time)) * dTdHour
	};
	const functions = {
		I: _I,
		xi: _xi,
		nu: _nu,
		nup: _nup,
		nupp: _nupp
	};
	Object.keys(functions).forEach((name) => {
		const functionCall = functions[name];
		result[name] = {
			value: modulus(functionCall(result.N.value, result.i.value, result.omega.value), 360),
			speed: null
		};
	});
	const hour = {
		value: (JD(time) - Math.floor(JD(time))) * 360,
		speed: 15
	};
	result["T+h-s"] = {
		value: hour.value + result.h.value - result.s.value,
		speed: hour.speed + result.h.speed - result.s.speed
	};
	result.P = {
		value: result.p.value - result.xi.value % 360,
		speed: null
	};
	return result;
};
var fundamentals$2 = {
	Mm: (a) => corrMm(d2r * a.N.value, d2r * a.p.value),
	Mf: (a) => corrMf(d2r * a.N.value),
	O1: (a) => corrO1(d2r * a.N.value),
	K1: (a) => corrK1(d2r * a.N.value),
	J1: (a) => corrJ1(d2r * a.N.value),
	M1B: (a) => corrM1B(d2r * a.N.value, d2r * a.p.value),
	M1C: (a) => corrM1(d2r * a.N.value, d2r * a.p.value),
	M1: (a) => corrM1(d2r * a.N.value, d2r * a.p.value),
	M1A: (a) => corrM1A(d2r * a.N.value, d2r * a.p.value),
	M2: (a) => corrM2(d2r * a.N.value),
	K2: (a) => corrK2(d2r * a.N.value),
	M3: (a) => corrM3(d2r * a.N.value),
	L2: (a) => corrL2(d2r * a.N.value, d2r * a.p.value),
	gamma2: (a) => corrGamma2(d2r * a.N.value, d2r * a.p.value),
	alpha2: (a) => corrAlpha2(d2r * a.p.value, d2r * a.pp.value),
	delta2: (a) => corrDelta2(d2r * a.N.value),
	xi2: (a) => corrXiEta2(d2r * a.N.value),
	eta2: (a) => corrXiEta2(d2r * a.N.value)
};
function corrMm(N, p) {
	return {
		f: 1 - .1311 * Math.cos(N) + .0538 * Math.cos(2 * p) + .0205 * Math.cos(2 * p - N),
		u: 0
	};
}
function corrMf(N) {
	return {
		f: 1.084 + .415 * Math.cos(N) + .039 * Math.cos(2 * N),
		u: -23.7 * Math.sin(N) + 2.7 * Math.sin(2 * N) - .4 * Math.sin(3 * N)
	};
}
function corrO1(N) {
	return {
		f: 1.0176 + .1871 * Math.cos(N) - .0147 * Math.cos(2 * N),
		u: 10.8 * Math.sin(N) - 1.34 * Math.sin(2 * N) + .19 * Math.sin(3 * N)
	};
}
function corrK1(N) {
	return {
		f: 1.006 + .115 * Math.cos(N) - .0088 * Math.cos(2 * N) + 6e-4 * Math.cos(3 * N),
		u: -8.86 * Math.sin(N) + .68 * Math.sin(2 * N) - .07 * Math.sin(3 * N)
	};
}
function corrJ1(N) {
	return {
		f: 1.1029 + .1676 * Math.cos(N) - .017 * Math.cos(2 * N) + .0016 * Math.cos(3 * N),
		u: -12.94 * Math.sin(N) + 1.34 * Math.sin(2 * N) - .19 * Math.sin(3 * N)
	};
}
function corrM2(N) {
	return {
		f: 1.0007 - .0373 * Math.cos(N) + 2e-4 * Math.cos(2 * N),
		u: -2.14 * Math.sin(N)
	};
}
function corrK2(N) {
	return {
		f: 1.0246 + .2863 * Math.cos(N) + .0083 * Math.cos(2 * N) - .0015 * Math.cos(3 * N),
		u: -17.74 * Math.sin(N) + .68 * Math.sin(2 * N) - .04 * Math.sin(3 * N)
	};
}
function corrM3(N) {
	const m2 = corrM2(N);
	return {
		f: Math.pow(Math.sqrt(m2.f), 3),
		u: -3.21 * Math.sin(N)
	};
}
function corrM1B(N, p) {
	return fromSinCos(2.783 * Math.sin(2 * p) + .558 * Math.sin(2 * p - N) + .184 * Math.sin(N), 1 + 2.783 * Math.cos(2 * p) + .558 * Math.cos(2 * p - N) + .184 * Math.cos(N));
}
function corrM1(N, p) {
	return fromSinCos(Math.sin(p) + .2 * Math.sin(p - N), 2 * (Math.cos(p) + .2 * Math.cos(p - N)));
}
function corrM1A(N, p) {
	return fromSinCos(-.3593 * Math.sin(2 * p) - .2 * Math.sin(N) - .066 * Math.sin(2 * p - N), 1 + .3593 * Math.cos(2 * p) + .2 * Math.cos(N) + .066 * Math.cos(2 * p - N));
}
function corrGamma2(N, p) {
	return fromSinCos(.147 * Math.sin(2 * (N - p)), 1 + .147 * Math.cos(2 * (N - p)));
}
function corrAlpha2(p, pp) {
	return fromSinCos(-.0446 * Math.sin(p - pp), 1 - .0446 * Math.cos(p - pp));
}
function corrDelta2(N) {
	return fromSinCos(.477 * Math.sin(N), 1 - .477 * Math.cos(N));
}
function corrXiEta2(N) {
	return fromSinCos(-.439 * Math.sin(N), 1 + .439 * Math.cos(N));
}
function corrL2(N, p) {
	return fromSinCos(-.2505 * Math.sin(2 * p) - .1102 * Math.sin(2 * p - N) - .0156 * Math.sin(2 * p - 2 * N) - .037 * Math.sin(N), 1 - .2505 * Math.cos(2 * p) - .1102 * Math.cos(2 * p - N) - .0156 * Math.cos(2 * p - 2 * N) - .037 * Math.cos(N));
}
/**
* Compute f and u from f·sinU / f·cosU form.
*/
function fromSinCos(fsinU, fcosU) {
	return {
		f: Math.sqrt(fsinU * fsinU + fcosU * fcosU),
		u: r2d * Math.atan2(fsinU, fcosU)
	};
}
var fundamentals$1 = {
	Mm: (a) => ({
		f: fMm(a),
		u: 0
	}),
	Mf: (a) => ({
		f: fMf(a),
		u: uMf(a)
	}),
	O1: (a) => ({
		f: fO1(a),
		u: uO1(a)
	}),
	K1: (a) => ({
		f: fK1(a),
		u: uK1(a)
	}),
	J1: (a) => ({
		f: fJ1(a),
		u: uJ1(a)
	}),
	OO1: (a) => ({
		f: fOO1(a),
		u: uOO1(a)
	}),
	M2: (a) => ({
		f: fM2(a),
		u: uM2(a)
	}),
	K2: (a) => ({
		f: fK2(a),
		u: uK2(a)
	}),
	L2: (a) => ({
		f: fL2(a),
		u: uL2(a)
	}),
	M1: (a) => ({
		f: fM1(a),
		u: uM1(a)
	}),
	M3: (a) => ({
		f: fModd(a, 3),
		u: uModd(a, 3)
	})
};
function fMm(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = (2 / 3 - Math.pow(Math.sin(omega), 2)) * (1 - 3 / 2 * Math.pow(Math.sin(i), 2));
	return (2 / 3 - Math.pow(Math.sin(I), 2)) / mean;
}
function fMf(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = Math.pow(Math.sin(omega), 2) * Math.pow(Math.cos(.5 * i), 4);
	return Math.pow(Math.sin(I), 2) / mean;
}
function fO1(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = Math.sin(omega) * Math.pow(Math.cos(.5 * omega), 2) * Math.pow(Math.cos(.5 * i), 4);
	return Math.sin(I) * Math.pow(Math.cos(.5 * I), 2) / mean;
}
function fJ1(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = Math.sin(2 * omega) * (1 - 3 / 2 * Math.pow(Math.sin(i), 2));
	return Math.sin(2 * I) / mean;
}
function fOO1(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = Math.sin(omega) * Math.pow(Math.sin(.5 * omega), 2) * Math.pow(Math.cos(.5 * i), 4);
	return Math.sin(I) * Math.pow(Math.sin(.5 * I), 2) / mean;
}
function fM2(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const mean = Math.pow(Math.cos(.5 * omega), 4) * Math.pow(Math.cos(.5 * i), 4);
	return Math.pow(Math.cos(.5 * I), 4) / mean;
}
function fK1(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const nu = d2r * a.nu.value;
	const mean = .5023 * (Math.sin(2 * omega) * (1 - 3 / 2 * Math.pow(Math.sin(i), 2))) + .1681;
	return Math.pow(.2523 * Math.pow(Math.sin(2 * I), 2) + .1689 * Math.sin(2 * I) * Math.cos(nu) + .0283, .5) / mean;
}
function fL2(a) {
	const P = d2r * a.P.value;
	const I = d2r * a.I.value;
	const rAInv = Math.pow(1 - 12 * Math.pow(Math.tan(.5 * I), 2) * Math.cos(2 * P) + 36 * Math.pow(Math.tan(.5 * I), 4), .5);
	return fM2(a) * rAInv;
}
function fK2(a) {
	const omega = d2r * a.omega.value;
	const i = d2r * a.i.value;
	const I = d2r * a.I.value;
	const nu = d2r * a.nu.value;
	const mean = .5023 * (Math.sin(omega) ** 2 * (1 - 3 / 2 * Math.sin(i) ** 2)) + .0365;
	return Math.pow(.2523 * Math.pow(Math.sin(I), 4) + .0367 * Math.pow(Math.sin(I), 2) * Math.cos(2 * nu) + .0013, .5) / mean;
}
function fM1(a) {
	const P = d2r * a.P.value;
	const I = d2r * a.I.value;
	const qAInv = Math.pow(.25 + 1.5 * Math.cos(I) * Math.cos(2 * P) * Math.pow(Math.cos(.5 * I), -.5) + 2.25 * Math.pow(Math.cos(I), 2) * Math.pow(Math.cos(.5 * I), -4), .5);
	return fO1(a) * qAInv;
}
function fModd(a, n) {
	return Math.pow(fM2(a), n / 2);
}
function uMf(a) {
	return -2 * a.xi.value;
}
function uO1(a) {
	return 2 * a.xi.value - a.nu.value;
}
function uJ1(a) {
	return -a.nu.value;
}
function uOO1(a) {
	return -2 * a.xi.value - a.nu.value;
}
function uM2(a) {
	return 2 * a.xi.value - 2 * a.nu.value;
}
function uK1(a) {
	return -a.nup.value;
}
function uL2(a) {
	const I = d2r * a.I.value;
	const P = d2r * a.P.value;
	const R = r2d * Math.atan(Math.sin(2 * P) / (1 / 6 * Math.pow(Math.tan(.5 * I), -2) - Math.cos(2 * P)));
	return 2 * a.xi.value - 2 * a.nu.value - R;
}
function uK2(a) {
	return -2 * a.nupp.value;
}
function uM1(a) {
	const I = d2r * a.I.value;
	const P = d2r * a.P.value;
	const Q = r2d * Math.atan((5 * Math.cos(I) - 1) / (7 * Math.cos(I) + 1) * Math.tan(P));
	return a.xi.value - a.nu.value + Q;
}
function uModd(a, n) {
	return n / 2 * uM2(a);
}
var fundamentals = {
	iho: fundamentals$2,
	schureman: fundamentals$1
};
function resolveFundamentals(name) {
	if (!name) return fundamentals$2;
	const fundamental = fundamentals[name];
	if (!fundamental) throw new Error(`Unknown fundamentals: ${name}`);
	return fundamental;
}
/** Tolerance for bisection root-finding: 1 second in hours */
var TOLERANCE_HOURS = 1 / 3600;
/** Evaluate h(t) = Σ Aᵢ·cos(ωᵢ·t + φᵢ) */
function evalH(t, params) {
	let sum = 0;
	for (let i = 0; i < params.length; i++) {
		const { A, w, phi } = params[i];
		sum += A * Math.cos(w * t + phi);
	}
	return sum;
}
/** Evaluate h'(t) = -Σ Aᵢ·ωᵢ·sin(ωᵢ·t + φᵢ) */
function evalHPrime(t, params) {
	let sum = 0;
	for (let i = 0; i < params.length; i++) {
		const { A, w, phi } = params[i];
		sum -= A * w * Math.sin(w * t + phi);
	}
	return sum;
}
/** Evaluate h''(t) = -Σ Aᵢ·ωᵢ²·cos(ωᵢ·t + φᵢ) */
function evalHDoublePrime(t, params) {
	let sum = 0;
	for (let i = 0; i < params.length; i++) {
		const { A, w, phi } = params[i];
		sum -= A * w * w * Math.cos(w * t + phi);
	}
	return sum;
}
/**
* Find root of h'(t) in [a, b] where h'(a) and h'(b) have opposite signs.
* Uses bisection for guaranteed convergence to within TOLERANCE_HOURS.
*/
function bisect(a, b, fa, params) {
	while (true) {
		const mid = (a + b) / 2;
		if (b - a < TOLERANCE_HOURS) return mid;
		const fMid = evalHPrime(mid, params);
		if (fMid === 0) return mid;
		if (fa > 0 ? fMid > 0 : fMid < 0) {
			a = mid;
			fa = fMid;
		} else b = mid;
	}
}
/**
* Find tidal extremes in [fromHour, toHour] using derivative root-finding.
*
* Finds zeros of h'(t) by bracketing at intervals guaranteed to contain
* at most one root, then bisecting to sub-second precision. Extremes are
* classified via the sign of h''(t). Spurious extremes are filtered using
* two criteria (modelled on Hatyan / NOAA CO-OPS practice):
*   1. Absolute prominence floor (prominenceThreshold, metres): extremes
*      whose min level change to either neighbor is below this threshold are
*      removed (Hatyan default 0.01 m; NOAA CO-OPS 0.03 m).
*   2. Minimum temporal gap: same-type adjacent extremes (H–H or L–L)
*      closer in time than dominantPeriod / (2 × 1.85) are candidates for
*      removal, where dominantPeriod is the highest-amplitude constituent in
*      the main tidal band (1–30 h). Disabled for double-tide stations
*      (Doodson criterion: (M4 + MS4) / M2 > 0.25) to preserve aggers.
* Greedy iterative removal (least-prominent first) handles clusters correctly.
*
* Since h(t) is a sum of cosines, it is valid for any t — including
* hours before 0 or beyond endHour.
*/
function findExtremes(fromHour, toHour, { startMs, isDoubleTide, prominenceThreshold, getParams }) {
	const results = [];
	let params = getParams(Math.max(0, fromHour));
	if (params.length === 0) return results;
	let maxSpeed = 0;
	for (const { w } of params) if (w > maxSpeed) maxSpeed = w;
	if (maxSpeed === 0) return results;
	const TIDAL_MIN_W = Math.PI / 15;
	const TIDAL_MAX_W = 2 * Math.PI;
	let dominantA = 0;
	let dominantW = 0;
	for (const { A, w } of params) if (w >= TIDAL_MIN_W && w <= TIDAL_MAX_W && A > dominantA) {
		dominantA = A;
		dominantW = w;
	}
	if (dominantW === 0) dominantW = maxSpeed;
	const minGapH = isDoubleTide ? 0 : Math.PI / (1.85 * dominantW);
	const bracket = Math.PI / (2 * maxSpeed);
	let tPrev = fromHour;
	let dPrev = evalHPrime(tPrev, params);
	for (let tNext = tPrev + bracket; tNext <= toHour + bracket; tNext += bracket) {
		const newParams = getParams(tPrev);
		if (newParams !== params) {
			params = newParams;
			dPrev = evalHPrime(tPrev, params);
		}
		const tBound = Math.min(tNext, toHour);
		const dNext = evalHPrime(tBound, params);
		if (dPrev !== 0 && dNext !== 0 && (dPrev > 0 ? dNext < 0 : dNext > 0)) {
			const tRoot = bisect(tPrev, tBound, dPrev, params);
			if (tRoot >= fromHour && tRoot <= toHour) {
				const isHigh = evalHDoublePrime(tRoot, params) < 0;
				results.push({
					time: new Date(startMs + tRoot * 60 * 60 * 1e3),
					level: evalH(tRoot, params),
					high: isHigh,
					low: !isHigh,
					label: isHigh ? "High" : "Low"
				});
			}
		}
		if (tBound >= toHour) break;
		tPrev = tBound;
		dPrev = dNext;
	}
	const n = results.length;
	if (n > 2) {
		const prv = new Int32Array(n);
		const nxt = new Int32Array(n);
		for (let i = 0; i < n; i++) {
			prv[i] = i - 1;
			nxt[i] = i + 1;
		}
		function evalProm(i) {
			const p = prv[i], nx = nxt[i];
			if (p < 0 || nx >= n) return {
				prom: Infinity,
				offending: false
			};
			const left = Math.abs(results[i].level - results[p].level);
			const right = Math.abs(results[nx].level - results[i].level);
			const prom = Math.min(left, right);
			const prevGapH = (results[i].time.getTime() - results[p].time.getTime()) / 36e5;
			const nextGapH = (results[nx].time.getTime() - results[i].time.getTime()) / 36e5;
			const tooClose = minGapH > 0 && (prevGapH < minGapH && results[i].high === results[p].high || nextGapH < minGapH && results[i].high === results[nx].high);
			return {
				prom,
				offending: prom < prominenceThreshold || tooClose
			};
		}
		function findWorst() {
			let worstIdx = -1;
			let worstProm = Infinity;
			for (let i = nxt[0]; nxt[i] < n; i = nxt[i]) {
				const { prom, offending } = evalProm(i);
				if (offending && prom < worstProm) {
					worstProm = prom;
					worstIdx = i;
				}
			}
			return {
				idx: worstIdx,
				prom: worstProm
			};
		}
		let worst = findWorst();
		while (worst.idx !== -1) {
			const p = prv[worst.idx], nx = nxt[worst.idx];
			nxt[p] = nx;
			prv[nx] = p;
			worst = findWorst();
		}
		const filtered = [];
		for (let i = 0; i < n; i = nxt[i]) filtered.push(results[i]);
		return filtered;
	}
	return results;
}
/** Get the height adjustment value for a high or low extreme, with identity default. */
function getHeightOffset(isHigh, offsets) {
	return (isHigh ? offsets?.height?.high : offsets?.height?.low) ?? (offsets?.height?.type === "fixed" ? 0 : 1);
}
function addExtremesOffsets(extreme, offsets) {
	if (typeof offsets === "undefined" || !offsets) return extreme;
	const heightAdj = getHeightOffset(extreme.high, offsets);
	if (offsets.height?.type === "fixed") extreme.level += heightAdj;
	else extreme.level *= heightAdj;
	if (extreme.high && offsets.time?.high) extreme.time = new Date(extreme.time.getTime() + offsets.time.high * 60 * 1e3);
	if (extreme.low && offsets.time?.low) extreme.time = new Date(extreme.time.getTime() + offsets.time.low * 60 * 1e3);
	return extreme;
}
function getExtremeLabel(label, highLowLabels) {
	if (typeof highLowLabels !== "undefined" && typeof highLowLabels[label] !== "undefined") return highLowLabels[label];
	return {
		high: "High",
		low: "Low"
	}[label];
}
/** Recompute node corrections daily for long spans */
var CORRECTION_INTERVAL_HOURS = 24;
/** Linear interpolation between two keyframe values */
function interpolate(fraction, a, b) {
	return a + fraction * (b - a);
}
function predictionFactory({ timeline, constituents, constituentModels, start, fundamentals = fundamentals$2, prominenceThreshold = .01 }) {
	const baseAstro = astro(start);
	const startMs = start.getTime();
	const endHour = (timeline.items[timeline.items.length - 1].getTime() - startMs) / 36e5;
	const m2Amp = constituents.find((c) => c.name === "M2")?.amplitude ?? 0;
	const m4Amp = constituents.find((c) => c.name === "M4")?.amplitude ?? 0;
	const ms4Amp = constituents.find((c) => c.name === "MS4")?.amplitude ?? 0;
	const isDoubleTide = m2Amp > 0 && (m4Amp + ms4Amp) / m2Amp > .25;
	/**
	* Precompute flat constituent parameters with node corrections evaluated
	* at a given time. Node corrections vary on the 18.6-year nodal cycle
	* and change by <0.01% per day.
	*/
	function prepareParams(correctionTime) {
		const correctionAstro = astro(correctionTime);
		const params = [];
		for (const constituent of constituents) {
			if (constituent.amplitude === 0) continue;
			const model = constituentModels[constituent.name];
			if (!model) continue;
			const V0 = d2r * model.value(baseAstro);
			const speed = d2r * model.speed;
			const correction = model.correction(correctionAstro, fundamentals);
			params.push({
				A: constituent.amplitude * correction.f,
				w: speed,
				phi: V0 + d2r * correction.u - constituent.phase
			});
		}
		return params;
	}
	/**
	* Create a function that returns constituent params with node corrections
	* recomputed at CORRECTION_INTERVAL_HOURS. Returns a new array reference
	* when corrections are recomputed, so callers can detect changes via `!==`.
	*/
	function correctedParams() {
		let params = prepareParams(new Date(startMs + Math.min(CORRECTION_INTERVAL_HOURS, endHour) / 2 * 36e5));
		let nextCorrectionAt = CORRECTION_INTERVAL_HOURS;
		return (hour) => {
			if (hour >= nextCorrectionAt) {
				const chunkEnd = Math.min(nextCorrectionAt + CORRECTION_INTERVAL_HOURS, endHour);
				params = prepareParams(new Date(startMs + (nextCorrectionAt + chunkEnd) / 2 * 36e5));
				nextCorrectionAt += CORRECTION_INTERVAL_HOURS;
			}
			return params;
		};
	}
	/** Options shared by both extremes call sites */
	const extremesOptions = {
		startMs,
		isDoubleTide,
		prominenceThreshold
	};
	function getExtremesPrediction({ labels, offsets } = {}) {
		return findExtremes(0, endHour, {
			...extremesOptions,
			getParams: correctedParams()
		}).map((extreme) => {
			if (labels) extreme.label = getExtremeLabel(extreme.high ? "high" : "low", labels);
			return addExtremesOffsets(extreme, offsets);
		});
	}
	/** 36-hour buffer in hours — ensures diurnal stations are fully bracketed by extremes. */
	const BUFFER_HOURS = 36;
	function getTimelinePrediction({ offsets } = {}) {
		if (!offsets) {
			const getParams = correctedParams();
			const results = [];
			for (let i = 0; i < timeline.items.length; i++) {
				const hour = timeline.hours[i];
				results.push({
					time: timeline.items[i],
					hour,
					level: evalH(hour, getParams(hour))
				});
			}
			return results;
		}
		const refExtremes = findExtremes(-36, endHour + BUFFER_HOURS, {
			...extremesOptions,
			getParams: correctedParams()
		});
		// v8 ignore if -- @preserve
		if (refExtremes.length < 2) throw new Error("At least two extremes are required for interpolation with offsets");
		const isFixed = offsets.height?.type === "fixed";
		const keyframes = refExtremes.map((extreme) => {
			const timeOffset = (extreme.high ? offsets.time?.high : offsets.time?.low) ?? 0;
			const heightAdj = getHeightOffset(extreme.high, offsets);
			return {
				subTime: extreme.time.getTime() + timeOffset * 60 * 1e3,
				refTime: extreme.time.getTime(),
				refLevel: extreme.level,
				subLevel: isFixed ? extreme.level + heightAdj : extreme.level * heightAdj
			};
		});
		const getParams = correctedParams();
		const results = [];
		let kfIdx = 0;
		for (let i = 0; i < timeline.items.length; i++) {
			const tMs = timeline.items[i].getTime();
			while (kfIdx < keyframes.length - 2 && keyframes[kfIdx + 1].subTime < tMs) kfIdx++;
			const kf0 = keyframes[kfIdx];
			const kf1 = keyframes[kfIdx + 1];
			const interval = kf1.subTime - kf0.subTime;
			const fraction = interval > 0 ? Math.max(0, Math.min(1, (tMs - kf0.subTime) / interval)) : 0;
			const mappedHour = (interpolate(fraction, kf0.refTime, kf1.refTime) - startMs) / 36e5;
			const refLevel = evalH(mappedHour, getParams(mappedHour));
			const refRange = kf1.refLevel - kf0.refLevel;
			const level = interpolate(refRange !== 0 ? (refLevel - kf0.refLevel) / refRange : fraction, kf0.subLevel, kf1.subLevel);
			results.push({
				time: timeline.items[i],
				hour: timeline.hours[i],
				level
			});
		}
		return results;
	}
	return Object.freeze({
		getExtremesPrediction,
		getTimelinePrediction
	});
}
/**
* Maps constituent letters to their species. K is omitted because it's
* ambiguous (K1 or K2) and resolved during sign resolution.
*/
var LETTER_MAP = {
	M: { species: 2 },
	S: { species: 2 },
	N: { species: 2 },
	O: { species: 1 },
	P: { species: 1 },
	Q: { species: 1 },
	J: { species: 1 },
	T: { species: 2 },
	R: { species: 2 },
	L: { species: 2 },
	nu: { species: 2 },
	lambda: { species: 2 }
};
var K1_INFO = { species: 1 };
var K2_INFO = { species: 2 };
/**
* Parse a compound constituent name into component tokens and target species.
*
* Format: `[multiplier]Letter[multiplier]Letter...species`
*
* Throws for names that cannot be decomposed — any constituent with nodal
* correction code "x" must have a parseable compound name.
*
* IHO Annex B exception: MA and MB constituents are annual variants that
* follow the same decomposition as their base M constituent.
*/
function parseName(name) {
	const fail = (reason) => /* @__PURE__ */ new Error(`Unable to parse compound constituent "${name}": ${reason}`);
	let normalizedName = name;
	if ((name.startsWith("MA") || name.startsWith("MB")) && name.length > 2) normalizedName = "M" + name.substring(2);
	const m = normalizedName.match(/^(.+?)(\d+)$/);
	if (!m) throw fail("no trailing species digits");
	const body = m[1];
	const targetSpecies = parseInt(m[2], 10);
	if (targetSpecies === 0) throw fail("species is 0");
	const tokens = [];
	let i = 0;
	while (i < body.length) {
		let multiplier = 0;
		while (i < body.length && body[i] >= "0" && body[i] <= "9") {
			multiplier = multiplier * 10 + (body.charCodeAt(i) - 48);
			i++;
		}
		if (multiplier === 0) multiplier = 1;
		if (i >= body.length) throw fail("trailing digits with no letter");
		if (body[i] === "(") {
			i++;
			const groupLetters = [];
			while (i < body.length && body[i] !== ")") {
				const letter = readLetter(body, i);
				if (!letter) throw fail(`unrecognized character at position ${i}`);
				groupLetters.push(letter);
				i += letter.length;
			}
			if (i >= body.length || body[i] !== ")") throw fail("unclosed parenthesized group");
			i++;
			if (groupLetters.length === 0) throw fail("empty parenthesized group");
			for (const letter of groupLetters) {
				if (!isKnownLetter(letter)) throw fail(`unknown letter "${letter}"`);
				tokens.push({
					letter,
					multiplier
				});
			}
			continue;
		}
		const letter = readLetter(body, i);
		if (!letter) throw fail(`unrecognized character at position ${i}`);
		if (!isKnownLetter(letter)) throw fail(`unknown letter "${letter}"`);
		i += letter.length;
		tokens.push({
			letter,
			multiplier
		});
	}
	return {
		tokens,
		targetSpecies
	};
}
/** Read a single letter or multi-char token (nu, lambda) at position i. */
function readLetter(body, i) {
	if (body.startsWith("nu", i) && (i + 2 >= body.length || !isLower(body[i + 2]))) return "nu";
	if (body.startsWith("lambda", i)) return "lambda";
	const ch = body[i];
	if (ch >= "A" && ch <= "Z") return ch;
	return null;
}
function isLower(ch) {
	return ch >= "a" && ch <= "z";
}
function isKnownLetter(letter) {
	if (letter === "A" || letter === "B") return false;
	return letter === "K" || letter in LETTER_MAP;
}
/**
* Resolve component signs using the IHO Annex B progressive right-to-left
* sign-flipping algorithm.
*
* For K (ambiguous between K1 and K2), tries K2 first then K1.
*/
function resolveSigns(tokens, targetSpecies) {
	if (tokens.some((t) => t.letter === "K")) {
		const result = tryResolve(tokens, targetSpecies, K2_INFO);
		if (result) return result;
		return tryResolve(tokens, targetSpecies, K1_INFO);
	}
	return tryResolve(tokens, targetSpecies, K2_INFO);
}
function tryResolve(tokens, targetSpecies, kInfo) {
	const infos = tokens.map((t) => t.letter === "K" ? kInfo : LETTER_MAP[t.letter]);
	/** Derive constituent key: letter + species (e.g. "M2", "S2", "K1") */
	const keyOf = (j) => tokens[j].letter + infos[j].species;
	if (tokens.length === 1) {
		const letterSpecies = infos[0].species;
		if (letterSpecies > 0 && targetSpecies > letterSpecies) return [{
			constituentKey: keyOf(0),
			factor: targetSpecies / letterSpecies
		}];
		if (letterSpecies === targetSpecies) return [{
			constituentKey: keyOf(0),
			factor: 1
		}];
	}
	const signs = new Array(tokens.length).fill(1);
	let total = 0;
	for (let j = 0; j < tokens.length; j++) total += tokens[j].multiplier * infos[j].species;
	for (let j = tokens.length - 1; j >= 0; j--) {
		if (total === targetSpecies) break;
		signs[j] = -1;
		total -= 2 * tokens[j].multiplier * infos[j].species;
	}
	if (total !== targetSpecies) return null;
	return tokens.map((t, j) => ({
		constituentKey: keyOf(j),
		factor: signs[j] * t.multiplier
	}));
}
/**
* Decompose a compound constituent name into its structural members.
* Each letter is mapped to its own constituent (e.g. N→N2, S→S2) with
* signed factors from the IHO Annex B sign-resolution algorithm.
*
* Returns null if the name cannot be parsed or sign resolution fails.
* Long-period constituents with non-standard naming conventions (e.g.
* "MSm", "KOo") use explicit members in data.json instead.
*
* @param name - Constituent name (e.g. "MS4", "2MK3", "2(MN)S6")
* @param species - Species from coefficients[0], or 0 if XDO is null
* @param constituents - Map of all constituents for resolving keys
*/
function decomposeCompound(name, species, constituents) {
	let parsed;
	try {
		parsed = parseName(name);
	} catch {
		return null;
	}
	const targetSpecies = species > 0 ? species : parsed.targetSpecies;
	const resolved = resolveSigns(parsed.tokens, targetSpecies);
	if (!resolved) return null;
	const members = [];
	for (const { constituentKey, factor } of resolved) {
		const constituent = constituents[constituentKey];
		if (!constituent) return null;
		members.push({
			constituent,
			factor
		});
	}
	return members.length > 0 ? members : null;
}
var constituents = {};
/**
* Create a constituent
*
* For null-XDO compounds, V₀ is derived lazily from members once they
* are resolved (V₀ = Σ factor × V₀(member)).
*/
function defineConstituent({ name, speed, xdo, aliases = [], members: memberRefs, nodalCorrection }) {
	const coefficients = xdo ? xdoToCoefficients(xdo) : null;
	let resolvedMembers = null;
	const constituent = {
		name,
		speed,
		aliases,
		coefficients,
		get members() {
			if (!resolvedMembers) if (memberRefs) resolvedMembers = memberRefs.map(([name, factor]) => {
				return {
					constituent: constituents[name],
					factor
				};
			});
			else resolvedMembers = resolveMembers(nodalCorrection, name, xdo?.[0] ?? 0) ?? [];
			return resolvedMembers;
		},
		value(astro) {
			if (coefficients) return computeV0(coefficients, astro);
			let v = 0;
			for (const { constituent: c, factor } of constituent.members) v += c.value(astro) * factor;
			return v;
		},
		correction(astro, fundamentals = fundamentals$2) {
			const fundamental = fundamentals[name];
			if (fundamental) return fundamental(astro);
			let f = 1;
			let u = 0;
			for (const { constituent: member, factor } of constituent.members) {
				const corr = member.correction(astro, fundamentals);
				u += factor * corr.u;
				f *= Math.pow(corr.f, Math.abs(factor));
			}
			return {
				u,
				f
			};
		}
	};
	[constituent.name, ...aliases].forEach((alias) => {
		constituents[alias] = constituent;
	});
	return constituent;
}
/**
* Convert XDO digit array to Doodson coefficients.
* D₁ is the τ coefficient (NOT offset). D₂–D₆ are each offset by 5.
* D₇ (90° phase) is negated to convert from IHO XDO convention to the
* Schureman/NOAA convention used by published harmonic constants.
*/
function xdoToCoefficients(xdo) {
	return [
		xdo[0],
		xdo[1] - 5,
		xdo[2] - 5,
		xdo[3] - 5,
		xdo[4] - 5,
		xdo[5] - 5,
		5 - xdo[6]
	];
}
/**
* Compute V₀ using Doodson coefficients and standard astronomical arguments.
* Uses N' = −N from the existing astronomy module's N value.
*/
function computeV0(coefficients, astro) {
	const values = [
		astro["T+h-s"].value,
		astro.s.value,
		astro.h.value,
		astro.p.value,
		-astro.N.value,
		astro.pp.value,
		90
	];
	let sum = 0;
	for (let i = 0; i < 7; i++) sum += coefficients[i] * values[i];
	return sum;
}
/**
* Resolve the IHO nodal correction code into pre-computed ConstituentMember[].
* This maps every code to the constituent members needed to compute
* f and u at prediction time, eliminating the code dispatch at runtime.
*
* Members reference structural constituents (e.g. N→N2 not M2). Each
* constituent's correction method recursively resolves each member's
* correction through its own members chain (N2.members → [{M2,1}] → M2 fundamental).
*/
function resolveMembers(code, name, species) {
	switch (code) {
		case "z":
		case "f": return null;
		case "y": return null;
		case "a": return [{
			constituent: constituents["Mm"],
			factor: 1
		}];
		case "m": return [{
			constituent: constituents["M2"],
			factor: 1
		}];
		case "o": return [{
			constituent: constituents["O1"],
			factor: 1
		}];
		case "k": return [{
			constituent: constituents["K1"],
			factor: 1
		}];
		case "j": return [{
			constituent: constituents["J1"],
			factor: 1
		}];
		case "b": return [{
			constituent: constituents["M2"],
			factor: -1
		}];
		case "c": return [{
			constituent: constituents["M2"],
			factor: -2
		}];
		case "g": return [{
			constituent: constituents["M2"],
			factor: species / 2
		}];
		case "p": return decomposeCompound("2MN2", species, constituents);
		case "d": return decomposeCompound("KQ1", species, constituents);
		case "q": return decomposeCompound("NKM2", species, constituents);
		case "x": return decomposeCompound(name, species, constituents);
	}
}
for (const entry of [
	{
		"name": "Zo",
		"speed": 0,
		"xdo": [
			0,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "z",
		"aliases": ["Z0"]
	},
	{
		"name": "Sa",
		"speed": .0410686,
		"xdo": [
			0,
			5,
			6,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "z",
		"aliases": ["SA"]
	},
	{
		"name": "Ssa",
		"speed": .0821373,
		"xdo": [
			0,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "z",
		"aliases": ["SSA"]
	},
	{
		"name": "Sta",
		"speed": .1232039,
		"xdo": [
			0,
			5,
			8,
			5,
			5,
			4,
			4
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["K2", 1], ["T2", -1]]
	},
	{
		"name": "MSm",
		"speed": .4715211,
		"xdo": [
			0,
			6,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["M2", 1], ["nu2", -1]]
	},
	{
		"name": "Mnum",
		"speed": .4715211,
		"xdo": [
			0,
			6,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["Mνm"],
		"members": [["M2", 1], ["nu2", -1]]
	},
	{
		"name": "Mm",
		"speed": .5443747,
		"xdo": [
			0,
			6,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": ["MM"]
	},
	{
		"name": "MSf",
		"speed": 1.0158958,
		"xdo": [
			0,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "b",
		"aliases": ["MSF"]
	},
	{
		"name": "MSo",
		"speed": 1.0158958,
		"xdo": [
			0,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "b",
		"aliases": ["MSO"]
	},
	{
		"name": "SM",
		"speed": 1.0158958,
		"xdo": [
			0,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["S2", 1], ["M2", -1]]
	},
	{
		"name": "Mf",
		"speed": 1.098033,
		"xdo": [
			0,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": ["MF"]
	},
	{
		"name": "KOo",
		"speed": 1.098033,
		"xdo": [
			0,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["K1", 1], ["O1", -1]]
	},
	{
		"name": "MKo",
		"speed": 1.098033,
		"xdo": [
			0,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["K2", 1], ["M2", -1]]
	},
	{
		"name": "Snu2",
		"speed": 1.4874168,
		"xdo": [
			0,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["Sν2"]
	},
	{
		"name": "SN",
		"speed": 1.5602705,
		"xdo": [
			0,
			8,
			3,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": [],
		"members": [["S2", 1], ["N2", -1]]
	},
	{
		"name": "MStm",
		"speed": 1.5695541,
		"xdo": [
			0,
			8,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["MSTM"],
		"members": [
			["Mf", 1],
			["M2", 1],
			["nu2", -1]
		]
	},
	{
		"name": "Mfm",
		"speed": 1.6424078,
		"xdo": [
			0,
			8,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "a",
		"aliases": ["MFM", "MTM"]
	},
	{
		"name": "2SM",
		"speed": 2.0317915,
		"xdo": [
			0,
			9,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "c",
		"aliases": []
	},
	{
		"name": "MSqm",
		"speed": 2.1139287,
		"xdo": [
			0,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "b",
		"aliases": ["MSQM"]
	},
	{
		"name": "Mqm",
		"speed": 2.1867829,
		"xdo": [
			0,
			9,
			5,
			3,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": ["MQM"]
	},
	{
		"name": "2SMN",
		"speed": 2.5761662,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": [],
		"members": [
			["S2", 2],
			["M2", -1],
			["N2", -1]
		]
	},
	{
		"name": "NJ1",
		"speed": 12.854286,
		"xdo": [
			1,
			2,
			5,
			7,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2Q1",
		"speed": 12.8542862,
		"xdo": [
			1,
			2,
			5,
			7,
			5,
			5,
			4
		],
		"nodalCorrection": "o",
		"aliases": []
	},
	{
		"name": "nuJ1",
		"speed": 12.9271398,
		"xdo": [
			1,
			2,
			7,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "o",
		"aliases": ["νJ1"]
	},
	{
		"name": "sigma1",
		"speed": 12.9271398,
		"xdo": [
			1,
			2,
			7,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "o",
		"aliases": [
			"σ1",
			"SGM",
			"SIGMA1"
		]
	},
	{
		"name": "NK1",
		"speed": 13.39866,
		"xdo": [
			1,
			3,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "Q1",
		"speed": 13.3986609,
		"xdo": [
			1,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "o",
		"aliases": []
	},
	{
		"name": "rho1",
		"speed": 13.4715145,
		"xdo": [
			1,
			3,
			7,
			4,
			5,
			5,
			4
		],
		"nodalCorrection": "o",
		"aliases": [
			"ρ1",
			"RHO",
			"RHO1"
		]
	},
	{
		"name": "nuK1",
		"speed": 13.4715146,
		"xdo": [
			1,
			3,
			7,
			4,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": ["νK1"]
	},
	{
		"name": "O1",
		"speed": 13.9430356,
		"xdo": [
			1,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "MK1",
		"speed": 13.9430356,
		"xdo": [
			1,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MS1",
		"speed": 13.9841042,
		"xdo": [
			1,
			4,
			6,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MP1",
		"speed": 14.0251729,
		"xdo": [
			1,
			4,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": []
	},
	{
		"name": "tau1",
		"speed": 14.0251729,
		"xdo": [
			1,
			4,
			7,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "k",
		"aliases": ["τ1", "TAU1"]
	},
	{
		"name": "M1B",
		"speed": 14.4874103,
		"xdo": [
			1,
			5,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "M1C",
		"speed": 14.492052,
		"xdo": [
			1,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "M1",
		"speed": 14.4966939,
		"xdo": [
			1,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "NO1",
		"speed": 14.4966939,
		"xdo": [
			1,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M1A",
		"speed": 14.496694,
		"xdo": [
			1,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "LP1",
		"speed": 14.5695476,
		"xdo": [
			1,
			5,
			7,
			4,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "chi1",
		"speed": 14.5695476,
		"xdo": [
			1,
			5,
			7,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "j",
		"aliases": ["χ1", "CHI1"]
	},
	{
		"name": "pi1",
		"speed": 14.9178647,
		"xdo": [
			1,
			6,
			2,
			5,
			5,
			6,
			4
		],
		"nodalCorrection": "z",
		"aliases": ["π1", "PI1"]
	},
	{
		"name": "TK1",
		"speed": 14.9178647,
		"xdo": [
			1,
			6,
			2,
			5,
			5,
			6,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SK1",
		"speed": 14.958931,
		"xdo": [
			1,
			6,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "P1",
		"speed": 14.9589314,
		"xdo": [
			1,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "z",
		"aliases": []
	},
	{
		"name": "S1",
		"speed": 15,
		"xdo": [
			1,
			6,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "z",
		"aliases": []
	},
	{
		"name": "SP1",
		"speed": 15.0410686,
		"xdo": [
			1,
			6,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "K1",
		"speed": 15.0410686,
		"xdo": [
			1,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "MO1",
		"speed": 15.0410686,
		"xdo": [
			1,
			6,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "RP1",
		"speed": 15.0821353,
		"xdo": [
			1,
			6,
			6,
			5,
			5,
			4,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "psi1",
		"speed": 15.0821353,
		"xdo": [
			1,
			6,
			6,
			5,
			5,
			4,
			6
		],
		"nodalCorrection": "z",
		"aliases": ["ψ1", "PSI1"]
	},
	{
		"name": "KP1",
		"speed": 15.1232059,
		"xdo": [
			1,
			6,
			7,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "phi1",
		"speed": 15.123206,
		"xdo": [
			1,
			6,
			7,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "j",
		"aliases": ["φ1", "PHI1"]
	},
	{
		"name": "lambdaO1",
		"speed": 15.5125897,
		"xdo": [
			1,
			7,
			3,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": ["λO1"]
	},
	{
		"name": "theta1",
		"speed": 15.5125897,
		"xdo": [
			1,
			7,
			3,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "j",
		"aliases": ["θ1", "THETA1"]
	},
	{
		"name": "J1",
		"speed": 15.5854433,
		"xdo": [
			1,
			7,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "MQ1",
		"speed": 15.5854434,
		"xdo": [
			1,
			7,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2PO1",
		"speed": 15.9748271,
		"xdo": [
			1,
			8,
			1,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SO1",
		"speed": 16.0569644,
		"xdo": [
			1,
			8,
			3,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "OO1",
		"speed": 16.1391017,
		"xdo": [
			1,
			8,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "d",
		"aliases": []
	},
	{
		"name": "ups1",
		"speed": 16.6834764,
		"xdo": [
			1,
			9,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "d",
		"aliases": ["υ1", "UPS1"]
	},
	{
		"name": "KQ1",
		"speed": 16.6834764,
		"xdo": [
			1,
			9,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MN2S2",
		"speed": 26.407938,
		"xdo": [
			2,
			0,
			9,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M(SK)2",
		"speed": 26.8701754,
		"xdo": [
			2,
			1,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MKS2",
		"speed": 26.8701754,
		"xdo": [
			2,
			1,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NS2",
		"speed": 26.8794591,
		"xdo": [
			2,
			1,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MS2",
		"speed": 26.9523127,
		"xdo": [
			2,
			1,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["MLN2S2"]
	},
	{
		"name": "3M2S2",
		"speed": 26.952313,
		"xdo": [
			2,
			1,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NK2S2",
		"speed": 26.9615964,
		"xdo": [
			2,
			1,
			9,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "OQ2",
		"speed": 27.3416965,
		"xdo": [
			2,
			2,
			5,
			6,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": ["OO2"]
	},
	{
		"name": "MNK2",
		"speed": 27.3416965,
		"xdo": [
			2,
			2,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNS2",
		"speed": 27.4238338,
		"xdo": [
			2,
			2,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "eps2",
		"speed": 27.4238338,
		"xdo": [
			2,
			2,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": ["ε2", "EP2"]
	},
	{
		"name": "MnuS2",
		"speed": 27.4966874,
		"xdo": [
			2,
			2,
			9,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["MνS2"]
	},
	{
		"name": "2ML2S2",
		"speed": 27.4966874,
		"xdo": [
			2,
			2,
			9,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNK2S2",
		"speed": 27.505971,
		"xdo": [
			2,
			2,
			9,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MS2K2",
		"speed": 27.8039339,
		"xdo": [
			2,
			3,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MK2",
		"speed": 27.8860712,
		"xdo": [
			2,
			3,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "O2",
		"speed": 27.8860712,
		"xdo": [
			2,
			3,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NLK2",
		"speed": 27.8860712,
		"xdo": [
			2,
			3,
			5,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2N2",
		"speed": 27.8953548,
		"xdo": [
			2,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": []
	},
	{
		"name": "mu2",
		"speed": 27.9682085,
		"xdo": [
			2,
			3,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": ["μ2", "MU2"]
	},
	{
		"name": "2MS2",
		"speed": 27.9682085,
		"xdo": [
			2,
			3,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SNK2",
		"speed": 28.3575923,
		"xdo": [
			2,
			4,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NA2",
		"speed": 28.3986629,
		"xdo": [
			2,
			4,
			4,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "N2",
		"speed": 28.4397295,
		"xdo": [
			2,
			4,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": []
	},
	{
		"name": "KQ2",
		"speed": 28.4397295,
		"xdo": [
			2,
			4,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NB2",
		"speed": 28.4807962,
		"xdo": [
			2,
			4,
			6,
			6,
			5,
			4,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "NA2*",
		"speed": 28.480798,
		"xdo": [
			2,
			4,
			6,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "nu2",
		"speed": 28.5125832,
		"xdo": [
			2,
			4,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "m",
		"aliases": ["ν2", "NU2"]
	},
	{
		"name": "MKL2S2",
		"speed": 28.5947204,
		"xdo": [
			2,
			4,
			9,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2KN2S2",
		"speed": 28.6040041,
		"xdo": [
			2,
			4,
			9,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSK2",
		"speed": 28.901967,
		"xdo": [
			2,
			5,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "OP2",
		"speed": 28.901967,
		"xdo": [
			2,
			5,
			3,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "gamma2",
		"speed": 28.9112506,
		"xdo": [
			2,
			5,
			3,
			7,
			5,
			5,
			7
		],
		"nodalCorrection": "y",
		"aliases": ["γ2", "GAMMA2"]
	},
	{
		"name": "MPS2",
		"speed": 28.9430356,
		"xdo": [
			2,
			5,
			4,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M(SK)2",
		"speed": 28.9430356,
		"xdo": [
			2,
			5,
			4,
			5,
			5,
			6,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA2",
		"speed": 28.943036,
		"xdo": [
			2,
			5,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "alpha2",
		"speed": 28.9430376,
		"xdo": [
			2,
			5,
			4,
			5,
			5,
			6,
			7
		],
		"nodalCorrection": "y",
		"aliases": ["α2", "ALPHA2"]
	},
	{
		"name": "M2",
		"speed": 28.9841042,
		"xdo": [
			2,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "KO2",
		"speed": 28.9841042,
		"xdo": [
			2,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSP2",
		"speed": 29.0251729,
		"xdo": [
			2,
			5,
			6,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MB2",
		"speed": 29.025173,
		"xdo": [
			2,
			5,
			6,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "MA2*",
		"speed": 29.025173,
		"xdo": [
			2,
			5,
			6,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "f",
		"aliases": []
	},
	{
		"name": "M(KS)2",
		"speed": 29.0251788,
		"xdo": [
			2,
			5,
			6,
			5,
			5,
			4,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MKS2",
		"speed": 29.0662415,
		"xdo": [
			2,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["3N2"]
	},
	{
		"name": "delta2",
		"speed": 29.066242,
		"xdo": [
			2,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": ["δ2", "DELTA2"]
	},
	{
		"name": "M2(KS)2",
		"speed": 29.148378,
		"xdo": [
			2,
			5,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["M2KS2"]
	},
	{
		"name": "2KM2S2",
		"speed": 29.1483788,
		"xdo": [
			2,
			5,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SN(MK)2",
		"speed": 29.373488,
		"xdo": [
			2,
			6,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2SNMK2"]
	},
	{
		"name": "lambda2",
		"speed": 29.4556253,
		"xdo": [
			2,
			6,
			3,
			6,
			5,
			5,
			7
		],
		"nodalCorrection": "m",
		"aliases": [
			"λ2",
			"LAM2",
			"LAMBDA2"
		]
	},
	{
		"name": "L2",
		"speed": 29.5284789,
		"xdo": [
			2,
			6,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "2MN2",
		"speed": 29.528479,
		"xdo": [
			2,
			6,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "L2A",
		"speed": 29.528479,
		"xdo": [
			2,
			6,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "p",
		"aliases": []
	},
	{
		"name": "3L2",
		"speed": 29.5331208,
		"xdo": [
			2,
			6,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NKM2",
		"speed": 29.5377626,
		"xdo": [
			2,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "L2B",
		"speed": 29.537763,
		"xdo": [
			2,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "q",
		"aliases": []
	},
	{
		"name": "2SK2",
		"speed": 29.9178627,
		"xdo": [
			2,
			7,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "T2",
		"speed": 29.9589333,
		"xdo": [
			2,
			7,
			2,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "z",
		"aliases": []
	},
	{
		"name": "S2",
		"speed": 30,
		"xdo": [
			2,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "z",
		"aliases": []
	},
	{
		"name": "KP2",
		"speed": 30,
		"xdo": [
			2,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "R2",
		"speed": 30.0410667,
		"xdo": [
			2,
			7,
			4,
			5,
			5,
			4,
			7
		],
		"nodalCorrection": "z",
		"aliases": []
	},
	{
		"name": "K2",
		"speed": 30.0821373,
		"xdo": [
			2,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": []
	},
	{
		"name": "MSnu2",
		"speed": 30.4715211,
		"xdo": [
			2,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["MSν2"]
	},
	{
		"name": "MSN2",
		"speed": 30.5443747,
		"xdo": [
			2,
			8,
			3,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "xi2",
		"speed": 30.5536583,
		"xdo": [
			2,
			8,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": ["ξ2", "XI2"]
	},
	{
		"name": "eta2",
		"speed": 30.626512,
		"xdo": [
			2,
			8,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "y",
		"aliases": ["η2", "ETA2"]
	},
	{
		"name": "KJ2",
		"speed": 30.626512,
		"xdo": [
			2,
			8,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2KM(SN)2",
		"speed": 30.7086493,
		"xdo": [
			2,
			8,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2KMSN2"]
	},
	{
		"name": "2SM2",
		"speed": 31.0158958,
		"xdo": [
			2,
			9,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MS2N2",
		"speed": 31.0887494,
		"xdo": [
			2,
			9,
			3,
			3,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SKM2",
		"speed": 31.098033,
		"xdo": [
			2,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2Snu2",
		"speed": 31.4874168,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["2Sν2"]
	},
	{
		"name": "3(SM)N2",
		"speed": 31.4874168,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SN2",
		"speed": 31.5602705,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SKN2",
		"speed": 31.6424078,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3S2M2",
		"speed": 32.0317915,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SK2M2",
		"speed": 32.1139288,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MQ3",
		"speed": 42.3827651,
		"xdo": [
			3,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NO3",
		"speed": 42.3827651,
		"xdo": [
			3,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MO3",
		"speed": 42.9271398,
		"xdo": [
			3,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MK3",
		"speed": 42.9271398,
		"xdo": [
			3,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NKM3",
		"speed": 42.9364235,
		"xdo": [
			3,
			4,
			5,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MS3",
		"speed": 42.9682085,
		"xdo": [
			3,
			4,
			6,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MP3",
		"speed": 43.0092771,
		"xdo": [
			3,
			4,
			7,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M3",
		"speed": 43.4761564,
		"xdo": [
			3,
			5,
			5,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "g",
		"aliases": []
	},
	{
		"name": "NK3",
		"speed": 43.4807982,
		"xdo": [
			3,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SO3",
		"speed": 43.9430356,
		"xdo": [
			3,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MP3",
		"speed": 43.9430356,
		"xdo": [
			3,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MS3",
		"speed": 43.9841042,
		"xdo": [
			3,
			6,
			4,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MK3",
		"speed": 44.0251729,
		"xdo": [
			3,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NSO3",
		"speed": 44.4966939,
		"xdo": [
			3,
			7,
			3,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MQ3",
		"speed": 44.5695476,
		"xdo": [
			3,
			7,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "T3",
		"speed": 44.9589333,
		"xdo": [
			3,
			8,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SP3",
		"speed": 44.9589314,
		"xdo": [
			3,
			8,
			1,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "S3",
		"speed": 45,
		"xdo": [
			3,
			8,
			2,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SK3",
		"speed": 45.0410686,
		"xdo": [
			3,
			8,
			3,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": ["R3"]
	},
	{
		"name": "K3",
		"speed": 45.1232059,
		"xdo": [
			3,
			8,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SO3",
		"speed": 46.0569644,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MS4",
		"speed": 55.936417,
		"xdo": [
			4,
			1,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4M2S4",
		"speed": 55.936417,
		"xdo": [
			4,
			1,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNK4",
		"speed": 56.3258007,
		"xdo": [
			4,
			2,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3NM4",
		"speed": 56.3350844,
		"xdo": [
			4,
			2,
			5,
			8,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNS4",
		"speed": 56.407938,
		"xdo": [
			4,
			2,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MnuS4",
		"speed": 56.4807917,
		"xdo": [
			4,
			2,
			9,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2MνS4"]
	},
	{
		"name": "3MK4",
		"speed": 56.8701754,
		"xdo": [
			4,
			3,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNLK4",
		"speed": 56.8701754,
		"xdo": [
			4,
			3,
			5,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2N4",
		"speed": 56.879459,
		"xdo": [
			4,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "N4",
		"speed": 56.8794591,
		"xdo": [
			4,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MS4",
		"speed": 56.9523127,
		"xdo": [
			4,
			3,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NKS4",
		"speed": 56.9615964,
		"xdo": [
			4,
			3,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSNK4",
		"speed": 57.3416965,
		"xdo": [
			4,
			4,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MN4",
		"speed": 57.4238338,
		"xdo": [
			4,
			4,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "Mnu4",
		"speed": 57.4966874,
		"xdo": [
			4,
			4,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["Mν4"]
	},
	{
		"name": "2MLS4",
		"speed": 57.4966874,
		"xdo": [
			4,
			4,
			7,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNKS4",
		"speed": 57.5059711,
		"xdo": [
			4,
			4,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSK4",
		"speed": 57.8860712,
		"xdo": [
			4,
			5,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA4",
		"speed": 57.92714,
		"xdo": [
			4,
			5,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M4",
		"speed": 57.9682085,
		"xdo": [
			4,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MRS4",
		"speed": 58.0092752,
		"xdo": [
			4,
			5,
			6,
			5,
			5,
			4,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MKS4",
		"speed": 58.0503458,
		"xdo": [
			4,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SN4",
		"speed": 58.4397295,
		"xdo": [
			4,
			6,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MN4",
		"speed": 58.5125832,
		"xdo": [
			4,
			6,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "ML4",
		"speed": 58.5125832,
		"xdo": [
			4,
			6,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "KN4",
		"speed": 58.5218668,
		"xdo": [
			4,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NK4",
		"speed": 58.521867,
		"xdo": [
			4,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SMK4",
		"speed": 58.901967,
		"xdo": [
			4,
			7,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M2SK4",
		"speed": 58.901967,
		"xdo": [
			4,
			7,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MT4",
		"speed": 58.9430376,
		"xdo": [
			4,
			7,
			2,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MS4",
		"speed": 58.9841042,
		"xdo": [
			4,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MR4",
		"speed": 59.0251709,
		"xdo": [
			4,
			7,
			4,
			5,
			5,
			4,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MK4",
		"speed": 59.0662415,
		"xdo": [
			4,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SNM4",
		"speed": 59.4556253,
		"xdo": [
			4,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SL4",
		"speed": 59.528479,
		"xdo": [
			4,
			8,
			3,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSN4",
		"speed": 59.5284794,
		"xdo": [
			4,
			8,
			3,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MKN4",
		"speed": 59.6106162,
		"xdo": [
			4,
			8,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "ST4",
		"speed": 59.9589333,
		"xdo": [
			4,
			9,
			0,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "S4",
		"speed": 60,
		"xdo": [
			4,
			9,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SK4",
		"speed": 60.0821373,
		"xdo": [
			4,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "K4",
		"speed": 60.1642746,
		"xdo": [
			4,
			9,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3SM4",
		"speed": 61.0158958,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SKM4",
		"speed": 61.098033,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNO5",
		"speed": 71.3668694,
		"xdo": [
			5,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NKMS5",
		"speed": 71.453648,
		"xdo": [
			5,
			3,
			7,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MO5",
		"speed": 71.911244,
		"xdo": [
			5,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MK5",
		"speed": 71.9112441,
		"xdo": [
			5,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NK5",
		"speed": 71.9205277,
		"xdo": [
			5,
			4,
			5,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MS5",
		"speed": 71.9523127,
		"xdo": [
			5,
			4,
			6,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MP5",
		"speed": 71.9933814,
		"xdo": [
			5,
			4,
			7,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NSO5",
		"speed": 72.3827651,
		"xdo": [
			5,
			5,
			3,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M5",
		"speed": 72.460261,
		"xdo": [
			5,
			5,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "g",
		"aliases": []
	},
	{
		"name": "MNK5",
		"speed": 72.4649024,
		"xdo": [
			5,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MB5",
		"speed": 72.501329,
		"xdo": [
			5,
			5,
			6,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSO5",
		"speed": 72.9271398,
		"xdo": [
			5,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MP5",
		"speed": 72.92714,
		"xdo": [
			5,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MS5",
		"speed": 72.9682085,
		"xdo": [
			5,
			6,
			4,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MO5",
		"speed": 73.009277,
		"xdo": [
			5,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MK5",
		"speed": 73.009277,
		"xdo": [
			5,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NSK5",
		"speed": 73.471515,
		"xdo": [
			5,
			7,
			3,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MQ5",
		"speed": 73.5536518,
		"xdo": [
			5,
			7,
			5,
			4,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSP5",
		"speed": 73.9430356,
		"xdo": [
			5,
			8,
			1,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSK5",
		"speed": 74.0251729,
		"xdo": [
			5,
			8,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3KM5",
		"speed": 74.1073102,
		"xdo": [
			5,
			8,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SP5",
		"speed": 74.9589314,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SK5",
		"speed": 75.0410686,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "(SK)K5",
		"speed": 75.1232059,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MN)K6",
		"speed": 84.7655303,
		"xdo": [
			6,
			1,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MKS6",
		"speed": 84.8383839,
		"xdo": [
			6,
			1,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MN)S6",
		"speed": 84.8476676,
		"xdo": [
			6,
			1,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5M2S6",
		"speed": 84.9205212,
		"xdo": [
			6,
			1,
			9,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MNK6",
		"speed": 85.309905,
		"xdo": [
			6,
			2,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "N6",
		"speed": 85.3191886,
		"xdo": [
			6,
			2,
			5,
			8,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MNS6",
		"speed": 85.3920423,
		"xdo": [
			6,
			2,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2NMLS6"]
	},
	{
		"name": "3NKS6",
		"speed": 85.4013259,
		"xdo": [
			6,
			2,
			7,
			8,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MnuS6",
		"speed": 85.4648959,
		"xdo": [
			6,
			2,
			9,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["3MνS6"]
	},
	{
		"name": "4MK6",
		"speed": 85.8542797,
		"xdo": [
			6,
			3,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M2N6",
		"speed": 85.863563,
		"xdo": [
			6,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NM6",
		"speed": 85.8635633,
		"xdo": [
			6,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MS6",
		"speed": 85.936417,
		"xdo": [
			6,
			3,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2MLNS6"]
	},
	{
		"name": "2NMKS6",
		"speed": 85.9457006,
		"xdo": [
			6,
			3,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSNK6",
		"speed": 86.3258007,
		"xdo": [
			6,
			4,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MN6",
		"speed": 86.407938,
		"xdo": [
			6,
			4,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2Mnu6",
		"speed": 86.4807917,
		"xdo": [
			6,
			4,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2Mν6", "3MLS6"]
	},
	{
		"name": "2MNO6",
		"speed": 86.480792,
		"xdo": [
			6,
			4,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNKS6",
		"speed": 86.4900753,
		"xdo": [
			6,
			4,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSK6",
		"speed": 86.8701754,
		"xdo": [
			6,
			5,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA6",
		"speed": 86.911244,
		"xdo": [
			6,
			5,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M6",
		"speed": 86.9523127,
		"xdo": [
			6,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MKS6",
		"speed": 87.03445,
		"xdo": [
			6,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MTN6",
		"speed": 87.3827671,
		"xdo": [
			6,
			6,
			2,
			6,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSN6",
		"speed": 87.4238338,
		"xdo": [
			6,
			6,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2ML6",
		"speed": 87.496687,
		"xdo": [
			6,
			6,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MN6",
		"speed": 87.4966874,
		"xdo": [
			6,
			6,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MKN6",
		"speed": 87.505971,
		"xdo": [
			6,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNK6",
		"speed": 87.5059711,
		"xdo": [
			6,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MKnu6",
		"speed": 87.5788247,
		"xdo": [
			6,
			6,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["MKν6"]
	},
	{
		"name": "2(MS)K6",
		"speed": 87.8860712,
		"xdo": [
			6,
			7,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MT6",
		"speed": 87.9271418,
		"xdo": [
			6,
			7,
			2,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MS6",
		"speed": 87.9682085,
		"xdo": [
			6,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MK6",
		"speed": 88.0503458,
		"xdo": [
			6,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SN6",
		"speed": 88.4397295,
		"xdo": [
			6,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MTN6",
		"speed": 88.4715165,
		"xdo": [
			6,
			8,
			2,
			4,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSL6",
		"speed": 88.512583,
		"xdo": [
			6,
			8,
			3,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSN6",
		"speed": 88.5125832,
		"xdo": [
			6,
			8,
			3,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "NSK6",
		"speed": 88.5218668,
		"xdo": [
			6,
			8,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SNK6",
		"speed": 88.521867,
		"xdo": [
			6,
			8,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MKN6",
		"speed": 88.59472,
		"xdo": [
			6,
			8,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MKL6",
		"speed": 88.5947205,
		"xdo": [
			6,
			8,
			5,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MST6",
		"speed": 88.9430376,
		"xdo": [
			6,
			9,
			0,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SM6",
		"speed": 88.9841042,
		"xdo": [
			6,
			9,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSK6",
		"speed": 89.0662415,
		"xdo": [
			6,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "SKM6",
		"speed": 89.066242,
		"xdo": [
			6,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2KM6",
		"speed": 89.1483788,
		"xdo": [
			6,
			9,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSTN6",
		"speed": 89.4874123,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MS)N6",
		"speed": 89.528479,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSKN6",
		"speed": 89.6106162,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "S6",
		"speed": 90,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNO7",
		"speed": 100.3509736,
		"xdo": [
			7,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MQ7",
		"speed": 100.3509736,
		"xdo": [
			7,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MK7",
		"speed": 100.8953483,
		"xdo": [
			7,
			4,
			5,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2NMK7",
		"speed": 100.904632,
		"xdo": [
			7,
			4,
			5,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNSO7",
		"speed": 101.3668694,
		"xdo": [
			7,
			5,
			3,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M7",
		"speed": 101.4443667,
		"xdo": [
			7,
			5,
			5,
			5,
			5,
			5,
			7
		],
		"nodalCorrection": "g",
		"aliases": []
	},
	{
		"name": "2MNK7",
		"speed": 101.4490067,
		"xdo": [
			7,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MNKO7",
		"speed": 101.4490067,
		"xdo": [
			7,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSO7",
		"speed": 101.9112441,
		"xdo": [
			7,
			6,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MK7",
		"speed": 101.9933814,
		"xdo": [
			7,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSKO7",
		"speed": 103.0092771,
		"xdo": [
			7,
			8,
			3,
			5,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2NS8",
		"speed": 113.8317718,
		"xdo": [
			8,
			1,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MNS8",
		"speed": 114.3761465,
		"xdo": [
			8,
			2,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MK8",
		"speed": 114.8383839,
		"xdo": [
			8,
			3,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MN)8",
		"speed": 114.8476676,
		"xdo": [
			8,
			3,
			5,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2MN8"]
	},
	{
		"name": "5MS8",
		"speed": 114.9205212,
		"xdo": [
			8,
			3,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MN)KS8",
		"speed": 114.9298048,
		"xdo": [
			8,
			3,
			7,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSNK8",
		"speed": 115.309905,
		"xdo": [
			8,
			4,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MN8",
		"speed": 115.3920423,
		"xdo": [
			8,
			4,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3Mnu8",
		"speed": 115.4648959,
		"xdo": [
			8,
			4,
			7,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["3Mν8", "4MLS8"]
	},
	{
		"name": "3MNKS8",
		"speed": 115.4741795,
		"xdo": [
			8,
			4,
			7,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSK8",
		"speed": 115.8542797,
		"xdo": [
			8,
			5,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA8",
		"speed": 115.895348,
		"xdo": [
			8,
			5,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M8",
		"speed": 115.936417,
		"xdo": [
			8,
			5,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MKS8",
		"speed": 116.0185542,
		"xdo": [
			8,
			5,
			7,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSN8",
		"speed": 116.407938,
		"xdo": [
			8,
			6,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3ML8",
		"speed": 116.4807917,
		"xdo": [
			8,
			6,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNK8",
		"speed": 116.4900753,
		"xdo": [
			8,
			6,
			5,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2SK8",
		"speed": 116.8701754,
		"xdo": [
			8,
			7,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(NS)8",
		"speed": 116.8794591,
		"xdo": [
			8,
			7,
			1,
			7,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MT8",
		"speed": 116.911246,
		"xdo": [
			8,
			7,
			2,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MS8",
		"speed": 116.9523127,
		"xdo": [
			8,
			7,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MK8",
		"speed": 117.03445,
		"xdo": [
			8,
			7,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SNM8",
		"speed": 117.4238338,
		"xdo": [
			8,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SMN8",
		"speed": 117.423834,
		"xdo": [
			8,
			8,
			1,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MSL8",
		"speed": 117.4966874,
		"xdo": [
			8,
			8,
			3,
			4,
			5,
			5,
			7
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSNK8",
		"speed": 117.5059711,
		"xdo": [
			8,
			8,
			3,
			6,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSN8",
		"speed": 117.578825,
		"xdo": [
			8,
			8,
			5,
			4,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MST8",
		"speed": 117.9271418,
		"xdo": [
			8,
			9,
			0,
			5,
			5,
			6,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MS)8",
		"speed": 117.9682085,
		"xdo": [
			8,
			9,
			1,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": ["2MS8"]
	},
	{
		"name": "2MSK8",
		"speed": 118.0503458,
		"xdo": [
			8,
			9,
			3,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MK)8",
		"speed": 118.132483,
		"xdo": [
			8,
			9,
			5,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3SN8",
		"speed": 118.4397295,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SML8",
		"speed": 118.5125832,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SKN8",
		"speed": 118.5218668,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MSKL8",
		"speed": 118.5947205,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3SM8",
		"speed": 118.9841042,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SMK8",
		"speed": 119.0662415,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "S8",
		"speed": 120,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MNO9",
		"speed": 129.3350779,
		"xdo": [
			9,
			3,
			5,
			6,
			5,
			5,
			4
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2M2NK9",
		"speed": 129.8887362,
		"xdo": [
			9,
			4,
			5,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MN)K9",
		"speed": 129.888738,
		"xdo": [
			9,
			4,
			5,
			7,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA9",
		"speed": 130.3874,
		"xdo": [
			9,
			5,
			4,
			5,
			5,
			5,
			5
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MNK9",
		"speed": 130.4331109,
		"xdo": [
			9,
			5,
			5,
			6,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MK9",
		"speed": 130.9774856,
		"xdo": [
			9,
			6,
			5,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSK9",
		"speed": 131.9933814,
		"xdo": [
			9,
			8,
			3,
			5,
			5,
			5,
			6
		],
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MNS10",
		"speed": 143.3602507,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2N10",
		"speed": 143.8317718,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "6MS10",
		"speed": 143.9046254,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2NKS10",
		"speed": 143.9139091,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSNK10",
		"speed": 144.2940092,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MN10",
		"speed": 144.3761465,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4Mnu10",
		"speed": 144.4490002,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["4Mν10"]
	},
	{
		"name": "5MSK10",
		"speed": 144.8383839,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M10",
		"speed": 144.9205212,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MKS10",
		"speed": 145.0026585,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSN10",
		"speed": 145.3920423,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["3MNS10"]
	},
	{
		"name": "6MN10",
		"speed": 145.4648959,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4ML10",
		"speed": 145.4648959,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MNK10",
		"speed": 145.4741795,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(SN)M10",
		"speed": 145.8635633,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MS10",
		"speed": 145.936417,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MK10",
		"speed": 146.0185542,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MS)N10",
		"speed": 146.407938,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSL10",
		"speed": 146.4807915,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2MNSK10",
		"speed": 146.4900753,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MSN10",
		"speed": 146.5629217,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2S10",
		"speed": 146.9523127,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3MSK10",
		"speed": 147.03445,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3SMN10",
		"speed": 147.4238338,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2SMKN10",
		"speed": 147.5059711,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4M2SN10",
		"speed": 147.578825,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3S2M10",
		"speed": 147.9682085,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MS)K10",
		"speed": 148.0503458,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSK11",
		"speed": 160.9774856,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5M2NS12",
		"speed": 171.7999803,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3(MN)12",
		"speed": 172.2715013,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "6MNS12",
		"speed": 172.344355,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4M2N12",
		"speed": 172.815876,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "7MS12",
		"speed": 172.8887297,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4M2NKS12",
		"speed": 172.8980133,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MSNK12",
		"speed": 173.2781135,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MN12",
		"speed": 173.3602507,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3N2MS12",
		"speed": 173.362457,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5Mnu12",
		"speed": 173.4331044,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["5Mν12"]
	},
	{
		"name": "6MSK12",
		"speed": 173.8224882,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "MA12",
		"speed": 173.863557,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "M12",
		"speed": 173.9046254,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSN12",
		"speed": 174.3761465,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["4MNS12"]
	},
	{
		"name": "4ML12",
		"speed": 174.449,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MNK12",
		"speed": 174.4582839,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "2(MSN)12",
		"speed": 174.8476676,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MT12",
		"speed": 174.8794545,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MS12",
		"speed": 174.9205212,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MK12",
		"speed": 175.0026585,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2SN12",
		"speed": 175.3920423,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "6MSN12",
		"speed": 175.4648959,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": ["4MSL12"]
	},
	{
		"name": "3MNKS12",
		"speed": 175.4741785,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MSN12",
		"speed": 175.547033,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MST12",
		"speed": 175.8953503,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4M2S12",
		"speed": 175.936417,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "4MSK12",
		"speed": 176.0185542,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3(MS)12",
		"speed": 176.9523127,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "3M2SK12",
		"speed": 177.03445,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MSN14",
		"speed": 203.3602507,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "5MNK14",
		"speed": 203.442388,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	},
	{
		"name": "6MS14",
		"speed": 203.9046254,
		"xdo": null,
		"nodalCorrection": "x",
		"aliases": []
	}
]) defineConstituent(entry);
var constituents_default = constituents;
var getDate = (time) => {
	if (time instanceof Date) return time;
	if (typeof time === "number") return /* @__PURE__ */ new Date(time * 1e3);
	throw new Error("Invalid date format, should be a Date object, or timestamp");
};
var getTimeline = (start, end, seconds = 600) => {
	const items = [];
	const endTime = Math.ceil(end.getTime() / 1e3 / seconds) * seconds;
	const startTime = Math.floor(start.getTime() / 1e3 / seconds) * seconds;
	let lastTime = startTime;
	const hours = [];
	while (lastTime <= endTime) {
		items.push(/* @__PURE__ */ new Date(lastTime * 1e3));
		hours.push((lastTime - startTime) / 3600);
		lastTime += seconds;
	}
	return {
		items,
		hours
	};
};
var harmonicsFactory = ({ harmonicConstituents, constituentModels = constituents_default, offset, fundamentals = fundamentals$2, prominenceThreshold }) => {
	if (!Array.isArray(harmonicConstituents)) throw new Error("Harmonic constituents are not an array");
	const constituents = [];
	harmonicConstituents.forEach((constituent) => {
		if (typeof constituent.name === "undefined") throw new Error("Harmonic constituents must have a name property");
		if (constituentModels[constituent.name] !== void 0) constituents.push({
			...constituent,
			phase: d2r * constituent.phase
		});
	});
	if (offset !== false) constituents.push({
		name: "Z0",
		phase: 0,
		amplitude: offset
	});
	let start = /* @__PURE__ */ new Date();
	let end = /* @__PURE__ */ new Date();
	const harmonics = {};
	harmonics.setTimeSpan = (startTime, endTime) => {
		start = getDate(startTime);
		end = getDate(endTime);
		if (start.getTime() >= end.getTime()) throw new Error("Start time must be before end time");
		return harmonics;
	};
	harmonics.prediction = (options) => {
		const opts = typeof options !== "undefined" ? options : { timeFidelity: 600 };
		const timeline = getTimeline(start, end, opts.timeFidelity);
		return predictionFactory({
			timeline,
			constituents,
			constituentModels,
			start: timeline.items[0] ?? start,
			fundamentals,
			prominenceThreshold: opts.prominenceThreshold ?? prominenceThreshold
		});
	};
	return Object.freeze(harmonics);
};
function createTidePredictor(constituents, options = {}) {
	const { nodeCorrections, ...harmonicsOpts } = options;
	const harmonicsOptions = {
		harmonicConstituents: constituents,
		fundamentals: resolveFundamentals(nodeCorrections),
		offset: false,
		...harmonicsOpts
	};
	return {
		getTimelinePrediction: ({ start, end, timeFidelity, offsets }) => {
			return harmonicsFactory(harmonicsOptions).setTimeSpan(start, end).prediction({ timeFidelity }).getTimelinePrediction({ offsets });
		},
		getExtremesPrediction: ({ start, end, labels, offsets }) => {
			return harmonicsFactory(harmonicsOptions).setTimeSpan(start, end).prediction().getExtremesPrediction({
				labels,
				offsets
			});
		},
		getWaterLevelAtTime: ({ time, offsets }) => {
			const endDate = new Date(time.getTime() + 600 * 1e3);
			return harmonicsFactory(harmonicsOptions).setTimeSpan(time, endDate).prediction().getTimelinePrediction({ offsets })[0];
		}
	};
}
/** @deprecated Use `import { constituents } from "@neaps/tide-predictor"; */
createTidePredictor.constituents = constituents_default;
//#endregion
//#region lib/harmonic-tides.ts
/**
* Prédiction de marée par analyse harmonique, hors ligne.
*
* Ce module est la source de vérité « calcul » de l'app : il ne dépend d'aucun
* réseau, contrairement à `lib/tides-api.ts` qui interroge un service distant.
* Les constantes harmoniques des 8 ports sont figées dans
* `lib/harmonics/stations.json` (jeu TICON-4 / GESLA-4 exposé par la base Neaps).
*/
var STATIONS = {
	biarritz: {
		"station": "Bayonne Boucau",
		"sourceId": "bayonne_boucau-94-fra-refmar",
		"latitude": 43.52732,
		"longitude": -1.51483,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 2.613,
		"mhwsAboveChartDatum": 4.272,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.2302,
				"phase": 96.3738
			},
			{
				"name": "N2",
				"amplitude": .25832,
				"phase": 76.5058
			},
			{
				"name": "S2",
				"amplitude": .42928,
				"phase": 128.906
			},
			{
				"name": "K2",
				"amplitude": .12259,
				"phase": 126.4305
			},
			{
				"name": "2N2",
				"amplitude": .03597,
				"phase": 57.9369
			},
			{
				"name": "S1",
				"amplitude": .00727,
				"phase": 21.2751
			},
			{
				"name": "K1",
				"amplitude": .05754,
				"phase": 71.1306
			},
			{
				"name": "P1",
				"amplitude": .01883,
				"phase": 58.9767
			},
			{
				"name": "O1",
				"amplitude": .0673,
				"phase": 323.3152
			},
			{
				"name": "Q1",
				"amplitude": .02085,
				"phase": 277.6183
			},
			{
				"name": "M1",
				"amplitude": .00202,
				"phase": 302.6901
			},
			{
				"name": "M4",
				"amplitude": .01252,
				"phase": 295.0795
			},
			{
				"name": "MM",
				"amplitude": .00195,
				"phase": 216.2836
			},
			{
				"name": "MF",
				"amplitude": .00383,
				"phase": 182.0156
			},
			{
				"name": "SA",
				"amplitude": .03954,
				"phase": 275.0764
			},
			{
				"name": "SSA",
				"amplitude": .03294,
				"phase": 111.6352
			},
			{
				"name": "T2",
				"amplitude": .0237,
				"phase": 126.0284
			},
			{
				"name": "J1",
				"amplitude": .00172,
				"phase": 130.0397
			},
			{
				"name": "L2",
				"amplitude": .03012,
				"phase": 109.9125
			},
			{
				"name": "R2",
				"amplitude": .00589,
				"phase": 164.1618
			},
			{
				"name": "2Q1",
				"amplitude": .0037,
				"phase": 234.0472
			},
			{
				"name": "MSF",
				"amplitude": .00294,
				"phase": 138.3973
			},
			{
				"name": "MSQM",
				"amplitude": .00319,
				"phase": 47.6717
			},
			{
				"name": "EP2",
				"amplitude": .00769,
				"phase": 40.1455
			},
			{
				"name": "M3",
				"amplitude": .01282,
				"phase": 332.7296
			},
			{
				"name": "MU2",
				"amplitude": .04183,
				"phase": 57.4024
			},
			{
				"name": "MTM",
				"amplitude": .00165,
				"phase": 325.9957
			},
			{
				"name": "NU2",
				"amplitude": .04767,
				"phase": 79.4662
			},
			{
				"name": "LAMBDA2",
				"amplitude": .00965,
				"phase": 96.3009
			},
			{
				"name": "MN4",
				"amplitude": .00978,
				"phase": 254.1461
			},
			{
				"name": "MS4",
				"amplitude": .00385,
				"phase": 169.7958
			},
			{
				"name": "MKS2",
				"amplitude": .00628,
				"phase": 81.292
			},
			{
				"name": "N4",
				"amplitude": .0034,
				"phase": 206.0314
			},
			{
				"name": "M6",
				"amplitude": 97e-5,
				"phase": 10.9319
			},
			{
				"name": "M8",
				"amplitude": .00488,
				"phase": 126.9887
			},
			{
				"name": "S4",
				"amplitude": .0025,
				"phase": 201.9441
			},
			{
				"name": "OO1",
				"amplitude": .00148,
				"phase": 221.3132
			},
			{
				"name": "S3",
				"amplitude": .00172,
				"phase": 103.5197
			},
			{
				"name": "MA2",
				"amplitude": .00433,
				"phase": 292.9014
			},
			{
				"name": "MB2",
				"amplitude": .00355,
				"phase": 226.5766
			},
			{
				"name": "T3",
				"amplitude": .00346,
				"phase": 120.4192
			},
			{
				"name": "R3",
				"amplitude": .00403,
				"phase": 313.9778
			},
			{
				"name": "RHO1",
				"amplitude": .00381,
				"phase": 286.1676
			},
			{
				"name": "SGM",
				"amplitude": .00313,
				"phase": 64.6542
			},
			{
				"name": "3L2",
				"amplitude": .00512,
				"phase": 265.1607
			},
			{
				"name": "3N2",
				"amplitude": .002,
				"phase": 32.062
			},
			{
				"name": "2SM2",
				"amplitude": .0038,
				"phase": 303.4706
			},
			{
				"name": "2MS6",
				"amplitude": .00149,
				"phase": 300.4787
			},
			{
				"name": "2MK5",
				"amplitude": 34e-5,
				"phase": 303.6375
			},
			{
				"name": "2MO5",
				"amplitude": 15e-5,
				"phase": 81.4389
			}
		]
	},
	"saint-jean-de-luz": {
		"station": "Saint Jean-de-Luz Socoa",
		"sourceId": "saint_jean_de_luz_socoa-95-fra-refmar",
		"latitude": 43.39524,
		"longitude": -1.68162,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 2.589,
		"mhwsAboveChartDatum": 4.38,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.32805,
				"phase": 92.7095
			},
			{
				"name": "N2",
				"amplitude": .28025,
				"phase": 72.7181
			},
			{
				"name": "S2",
				"amplitude": .46323,
				"phase": 125.0017
			},
			{
				"name": "K2",
				"amplitude": .13192,
				"phase": 122.1186
			},
			{
				"name": "2N2",
				"amplitude": .03947,
				"phase": 52.9693
			},
			{
				"name": "S1",
				"amplitude": .00598,
				"phase": 16.7609
			},
			{
				"name": "K1",
				"amplitude": .061,
				"phase": 68.0851
			},
			{
				"name": "P1",
				"amplitude": .02001,
				"phase": 55.4181
			},
			{
				"name": "O1",
				"amplitude": .07093,
				"phase": 320.1429
			},
			{
				"name": "Q1",
				"amplitude": .02222,
				"phase": 274.3516
			},
			{
				"name": "M1",
				"amplitude": .00276,
				"phase": 306.9553
			},
			{
				"name": "M4",
				"amplitude": .02902,
				"phase": 328.0168
			},
			{
				"name": "MM",
				"amplitude": .00335,
				"phase": 209.6536
			},
			{
				"name": "MF",
				"amplitude": .00573,
				"phase": 170.806
			},
			{
				"name": "SA",
				"amplitude": .03663,
				"phase": 217.9336
			},
			{
				"name": "SSA",
				"amplitude": .01965,
				"phase": 89.4711
			},
			{
				"name": "T2",
				"amplitude": .02621,
				"phase": 119.977
			},
			{
				"name": "J1",
				"amplitude": .00187,
				"phase": 111.4982
			},
			{
				"name": "L2",
				"amplitude": .03317,
				"phase": 108.4078
			},
			{
				"name": "R2",
				"amplitude": .0052,
				"phase": 132.6732
			},
			{
				"name": "2Q1",
				"amplitude": .00428,
				"phase": 231.0836
			},
			{
				"name": "MSF",
				"amplitude": .00302,
				"phase": 172.1832
			},
			{
				"name": "MSQM",
				"amplitude": 95e-5,
				"phase": 326.3812
			},
			{
				"name": "EP2",
				"amplitude": .01043,
				"phase": 27.8957
			},
			{
				"name": "M3",
				"amplitude": .01381,
				"phase": 327.5055
			},
			{
				"name": "MU2",
				"amplitude": .04566,
				"phase": 52.0784
			},
			{
				"name": "MTM",
				"amplitude": .00151,
				"phase": 334.0221
			},
			{
				"name": "NU2",
				"amplitude": .05341,
				"phase": 75.4512
			},
			{
				"name": "LAMBDA2",
				"amplitude": .00773,
				"phase": 97.4838
			},
			{
				"name": "MN4",
				"amplitude": .014,
				"phase": 281.5188
			},
			{
				"name": "MS4",
				"amplitude": .0094,
				"phase": 37.3987
			},
			{
				"name": "MKS2",
				"amplitude": .0051,
				"phase": 79.2039
			},
			{
				"name": "N4",
				"amplitude": .00366,
				"phase": 229.0332
			},
			{
				"name": "M6",
				"amplitude": .00401,
				"phase": 106.9878
			},
			{
				"name": "M8",
				"amplitude": .00134,
				"phase": 277.4723
			},
			{
				"name": "S4",
				"amplitude": 63e-5,
				"phase": 186.5097
			},
			{
				"name": "OO1",
				"amplitude": .00145,
				"phase": 214.0555
			},
			{
				"name": "S3",
				"amplitude": .00172,
				"phase": 80.7874
			},
			{
				"name": "MA2",
				"amplitude": .00199,
				"phase": 49.1145
			},
			{
				"name": "MB2",
				"amplitude": .00495,
				"phase": 91.921
			},
			{
				"name": "T3",
				"amplitude": .00371,
				"phase": 113.8445
			},
			{
				"name": "R3",
				"amplitude": .00393,
				"phase": 299.8627
			},
			{
				"name": "RHO1",
				"amplitude": .00412,
				"phase": 283.5928
			},
			{
				"name": "SGM",
				"amplitude": .00422,
				"phase": 60.7476
			},
			{
				"name": "3L2",
				"amplitude": .00602,
				"phase": 256.8132
			},
			{
				"name": "3N2",
				"amplitude": .00178,
				"phase": 274.3493
			},
			{
				"name": "2SM2",
				"amplitude": .00182,
				"phase": 312.5052
			},
			{
				"name": "2MS6",
				"amplitude": .00296,
				"phase": 160.3851
			},
			{
				"name": "2MK5",
				"amplitude": 52e-5,
				"phase": 353.7509
			},
			{
				"name": "2MO5",
				"amplitude": 17e-5,
				"phase": 90.5754
			}
		]
	},
	capbreton: {
		"station": "Bayonne Boucau",
		"sourceId": "bayonne_boucau-94-fra-refmar",
		"latitude": 43.52732,
		"longitude": -1.51483,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 2.613,
		"mhwsAboveChartDatum": 4.272,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.2302,
				"phase": 96.3738
			},
			{
				"name": "N2",
				"amplitude": .25832,
				"phase": 76.5058
			},
			{
				"name": "S2",
				"amplitude": .42928,
				"phase": 128.906
			},
			{
				"name": "K2",
				"amplitude": .12259,
				"phase": 126.4305
			},
			{
				"name": "2N2",
				"amplitude": .03597,
				"phase": 57.9369
			},
			{
				"name": "S1",
				"amplitude": .00727,
				"phase": 21.2751
			},
			{
				"name": "K1",
				"amplitude": .05754,
				"phase": 71.1306
			},
			{
				"name": "P1",
				"amplitude": .01883,
				"phase": 58.9767
			},
			{
				"name": "O1",
				"amplitude": .0673,
				"phase": 323.3152
			},
			{
				"name": "Q1",
				"amplitude": .02085,
				"phase": 277.6183
			},
			{
				"name": "M1",
				"amplitude": .00202,
				"phase": 302.6901
			},
			{
				"name": "M4",
				"amplitude": .01252,
				"phase": 295.0795
			},
			{
				"name": "MM",
				"amplitude": .00195,
				"phase": 216.2836
			},
			{
				"name": "MF",
				"amplitude": .00383,
				"phase": 182.0156
			},
			{
				"name": "SA",
				"amplitude": .03954,
				"phase": 275.0764
			},
			{
				"name": "SSA",
				"amplitude": .03294,
				"phase": 111.6352
			},
			{
				"name": "T2",
				"amplitude": .0237,
				"phase": 126.0284
			},
			{
				"name": "J1",
				"amplitude": .00172,
				"phase": 130.0397
			},
			{
				"name": "L2",
				"amplitude": .03012,
				"phase": 109.9125
			},
			{
				"name": "R2",
				"amplitude": .00589,
				"phase": 164.1618
			},
			{
				"name": "2Q1",
				"amplitude": .0037,
				"phase": 234.0472
			},
			{
				"name": "MSF",
				"amplitude": .00294,
				"phase": 138.3973
			},
			{
				"name": "MSQM",
				"amplitude": .00319,
				"phase": 47.6717
			},
			{
				"name": "EP2",
				"amplitude": .00769,
				"phase": 40.1455
			},
			{
				"name": "M3",
				"amplitude": .01282,
				"phase": 332.7296
			},
			{
				"name": "MU2",
				"amplitude": .04183,
				"phase": 57.4024
			},
			{
				"name": "MTM",
				"amplitude": .00165,
				"phase": 325.9957
			},
			{
				"name": "NU2",
				"amplitude": .04767,
				"phase": 79.4662
			},
			{
				"name": "LAMBDA2",
				"amplitude": .00965,
				"phase": 96.3009
			},
			{
				"name": "MN4",
				"amplitude": .00978,
				"phase": 254.1461
			},
			{
				"name": "MS4",
				"amplitude": .00385,
				"phase": 169.7958
			},
			{
				"name": "MKS2",
				"amplitude": .00628,
				"phase": 81.292
			},
			{
				"name": "N4",
				"amplitude": .0034,
				"phase": 206.0314
			},
			{
				"name": "M6",
				"amplitude": 97e-5,
				"phase": 10.9319
			},
			{
				"name": "M8",
				"amplitude": .00488,
				"phase": 126.9887
			},
			{
				"name": "S4",
				"amplitude": .0025,
				"phase": 201.9441
			},
			{
				"name": "OO1",
				"amplitude": .00148,
				"phase": 221.3132
			},
			{
				"name": "S3",
				"amplitude": .00172,
				"phase": 103.5197
			},
			{
				"name": "MA2",
				"amplitude": .00433,
				"phase": 292.9014
			},
			{
				"name": "MB2",
				"amplitude": .00355,
				"phase": 226.5766
			},
			{
				"name": "T3",
				"amplitude": .00346,
				"phase": 120.4192
			},
			{
				"name": "R3",
				"amplitude": .00403,
				"phase": 313.9778
			},
			{
				"name": "RHO1",
				"amplitude": .00381,
				"phase": 286.1676
			},
			{
				"name": "SGM",
				"amplitude": .00313,
				"phase": 64.6542
			},
			{
				"name": "3L2",
				"amplitude": .00512,
				"phase": 265.1607
			},
			{
				"name": "3N2",
				"amplitude": .002,
				"phase": 32.062
			},
			{
				"name": "2SM2",
				"amplitude": .0038,
				"phase": 303.4706
			},
			{
				"name": "2MS6",
				"amplitude": .00149,
				"phase": 300.4787
			},
			{
				"name": "2MK5",
				"amplitude": 34e-5,
				"phase": 303.6375
			},
			{
				"name": "2MO5",
				"amplitude": 15e-5,
				"phase": 81.4389
			}
		]
	},
	arcachon: {
		"station": "Arcachon Eyrac",
		"sourceId": "arcachon_eyrac-190-fra-refmar",
		"latitude": 44.665001,
		"longitude": -1.16355,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 2.493,
		"mhwsAboveChartDatum": 4.268,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.33876,
				"phase": 118.9554
			},
			{
				"name": "N2",
				"amplitude": .26301,
				"phase": 103.8372
			},
			{
				"name": "S2",
				"amplitude": .43581,
				"phase": 158.741
			},
			{
				"name": "K2",
				"amplitude": .12423,
				"phase": 155.6806
			},
			{
				"name": "2N2",
				"amplitude": .03527,
				"phase": 91.8069
			},
			{
				"name": "S1",
				"amplitude": .00805,
				"phase": 26.1838
			},
			{
				"name": "K1",
				"amplitude": .05535,
				"phase": 87.2775
			},
			{
				"name": "P1",
				"amplitude": .02138,
				"phase": 78.7284
			},
			{
				"name": "O1",
				"amplitude": .0688,
				"phase": 337.863
			},
			{
				"name": "Q1",
				"amplitude": .0211,
				"phase": 294.0815
			},
			{
				"name": "M1",
				"amplitude": .00148,
				"phase": 317.1676
			},
			{
				"name": "M4",
				"amplitude": .06676,
				"phase": 41.8208
			},
			{
				"name": "MM",
				"amplitude": .02173,
				"phase": 8.4667
			},
			{
				"name": "MF",
				"amplitude": .00711,
				"phase": 39.8967
			},
			{
				"name": "SA",
				"amplitude": .06184,
				"phase": 256.7724
			},
			{
				"name": "SSA",
				"amplitude": .01627,
				"phase": 97.3332
			},
			{
				"name": "T2",
				"amplitude": .02272,
				"phase": 147.5021
			},
			{
				"name": "J1",
				"amplitude": .0023,
				"phase": 176.828
			},
			{
				"name": "L2",
				"amplitude": .06097,
				"phase": 110.2768
			},
			{
				"name": "R2",
				"amplitude": .00351,
				"phase": 186.5717
			},
			{
				"name": "2Q1",
				"amplitude": .00409,
				"phase": 250.785
			},
			{
				"name": "MSF",
				"amplitude": .04648,
				"phase": 36.0982
			},
			{
				"name": "MSQM",
				"amplitude": .00263,
				"phase": 61.3277
			},
			{
				"name": "EP2",
				"amplitude": .01611,
				"phase": 173.414
			},
			{
				"name": "M3",
				"amplitude": .01111,
				"phase": 11.8391
			},
			{
				"name": "MU2",
				"amplitude": .05275,
				"phase": 172.0328
			},
			{
				"name": "MTM",
				"amplitude": .00573,
				"phase": 67.5808
			},
			{
				"name": "NU2",
				"amplitude": .05261,
				"phase": 96.3508
			},
			{
				"name": "LAMBDA2",
				"amplitude": .03152,
				"phase": 93.3129
			},
			{
				"name": "MN4",
				"amplitude": .02069,
				"phase": 21.5083
			},
			{
				"name": "MS4",
				"amplitude": .03818,
				"phase": 116.0153
			},
			{
				"name": "MKS2",
				"amplitude": .00641,
				"phase": 230.8426
			},
			{
				"name": "N4",
				"amplitude": .0029,
				"phase": 15.8454
			},
			{
				"name": "M6",
				"amplitude": .06229,
				"phase": 15.8973
			},
			{
				"name": "M8",
				"amplitude": .00839,
				"phase": 307.7279
			},
			{
				"name": "S4",
				"amplitude": .0101,
				"phase": 219.6146
			},
			{
				"name": "OO1",
				"amplitude": .00243,
				"phase": 235.4982
			},
			{
				"name": "S3",
				"amplitude": .00127,
				"phase": 127.5393
			},
			{
				"name": "MA2",
				"amplitude": .00985,
				"phase": 19.833
			},
			{
				"name": "MB2",
				"amplitude": .01051,
				"phase": 125.3
			},
			{
				"name": "T3",
				"amplitude": .00409,
				"phase": 174.9829
			},
			{
				"name": "R3",
				"amplitude": .00543,
				"phase": 10.5006
			},
			{
				"name": "RHO1",
				"amplitude": .00382,
				"phase": 298.0061
			},
			{
				"name": "SGM",
				"amplitude": .00287,
				"phase": 96.0265
			},
			{
				"name": "3L2",
				"amplitude": .00613,
				"phase": 286.8915
			},
			{
				"name": "3N2",
				"amplitude": .00147,
				"phase": 30.2211
			},
			{
				"name": "2SM2",
				"amplitude": .02143,
				"phase": 323.887
			},
			{
				"name": "2MS6",
				"amplitude": .06054,
				"phase": 54.321
			},
			{
				"name": "2MK5",
				"amplitude": .00612,
				"phase": 254.2097
			},
			{
				"name": "2MO5",
				"amplitude": .00757,
				"phase": 311.937
			}
		]
	},
	"la-rochelle": {
		"station": "La Rochelle-la-Pallice",
		"sourceId": "la_rochelle_la_pallice-34-fra-refmar",
		"latitude": 46.158501,
		"longitude": -1.22065,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 3.948,
		"mhwsAboveChartDatum": 6.326,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.74851,
				"phase": 98.5055
			},
			{
				"name": "N2",
				"amplitude": .36398,
				"phase": 79.4183
			},
			{
				"name": "S2",
				"amplitude": .62975,
				"phase": 131.6204
			},
			{
				"name": "K2",
				"amplitude": .17856,
				"phase": 129.2333
			},
			{
				"name": "2N2",
				"amplitude": .0505,
				"phase": 59.7818
			},
			{
				"name": "S1",
				"amplitude": .01226,
				"phase": 24.1388
			},
			{
				"name": "K1",
				"amplitude": .06269,
				"phase": 73.9562
			},
			{
				"name": "P1",
				"amplitude": .02264,
				"phase": 60.8447
			},
			{
				"name": "O1",
				"amplitude": .07253,
				"phase": 326.0541
			},
			{
				"name": "Q1",
				"amplitude": .02273,
				"phase": 281.6129
			},
			{
				"name": "M1",
				"amplitude": .00226,
				"phase": 312.8873
			},
			{
				"name": "M4",
				"amplitude": .2475,
				"phase": 10.9085
			},
			{
				"name": "MM",
				"amplitude": .00704,
				"phase": 222.1835
			},
			{
				"name": "MF",
				"amplitude": .01021,
				"phase": 186.5702
			},
			{
				"name": "SA",
				"amplitude": .04018,
				"phase": 239.3847
			},
			{
				"name": "SSA",
				"amplitude": .02318,
				"phase": 102.2598
			},
			{
				"name": "T2",
				"amplitude": .03251,
				"phase": 125.2476
			},
			{
				"name": "J1",
				"amplitude": .00183,
				"phase": 124.2625
			},
			{
				"name": "L2",
				"amplitude": .04503,
				"phase": 104.5246
			},
			{
				"name": "R2",
				"amplitude": .00374,
				"phase": 148.4233
			},
			{
				"name": "2Q1",
				"amplitude": .00382,
				"phase": 229.9311
			},
			{
				"name": "MSF",
				"amplitude": .00815,
				"phase": 215.1466
			},
			{
				"name": "MSQM",
				"amplitude": .00166,
				"phase": 273.6074
			},
			{
				"name": "EP2",
				"amplitude": .01376,
				"phase": 49.4292
			},
			{
				"name": "M3",
				"amplitude": .03162,
				"phase": 338.3929
			},
			{
				"name": "MU2",
				"amplitude": .06078,
				"phase": 68.6489
			},
			{
				"name": "MTM",
				"amplitude": .00201,
				"phase": 187.6569
			},
			{
				"name": "NU2",
				"amplitude": .06836,
				"phase": 81.9155
			},
			{
				"name": "LAMBDA2",
				"amplitude": .01353,
				"phase": 77.9001
			},
			{
				"name": "MN4",
				"amplitude": .1092,
				"phase": 323.4301
			},
			{
				"name": "MS4",
				"amplitude": .09961,
				"phase": 95.8772
			},
			{
				"name": "MKS2",
				"amplitude": .00531,
				"phase": 96.5255
			},
			{
				"name": "N4",
				"amplitude": .02511,
				"phase": 268.3774
			},
			{
				"name": "M6",
				"amplitude": .04055,
				"phase": 312.1855
			},
			{
				"name": "M8",
				"amplitude": .00466,
				"phase": 239.5011
			},
			{
				"name": "S4",
				"amplitude": .00658,
				"phase": 245.8361
			},
			{
				"name": "OO1",
				"amplitude": .0013,
				"phase": 230.2767
			},
			{
				"name": "S3",
				"amplitude": .00337,
				"phase": 114.6615
			},
			{
				"name": "MA2",
				"amplitude": .01061,
				"phase": 3.3737
			},
			{
				"name": "MB2",
				"amplitude": .01289,
				"phase": 71.3003
			},
			{
				"name": "T3",
				"amplitude": .00957,
				"phase": 127.8696
			},
			{
				"name": "R3",
				"amplitude": .01044,
				"phase": 314.5056
			},
			{
				"name": "RHO1",
				"amplitude": .00416,
				"phase": 287.1773
			},
			{
				"name": "SGM",
				"amplitude": .00422,
				"phase": 60.4301
			},
			{
				"name": "3L2",
				"amplitude": .0077,
				"phase": 268.4639
			},
			{
				"name": "3N2",
				"amplitude": .00173,
				"phase": 303.9163
			},
			{
				"name": "2SM2",
				"amplitude": .00502,
				"phase": 286.4855
			},
			{
				"name": "2MS6",
				"amplitude": .03144,
				"phase": 352.9058
			},
			{
				"name": "2MK5",
				"amplitude": .00694,
				"phase": 166.7513
			},
			{
				"name": "2MO5",
				"amplitude": .00569,
				"phase": 262.6332
			}
		]
	},
	"les-sables": {
		"station": "Les Sables d'Olonne",
		"sourceId": "les_sables_d_olonne-62-fra-refmar",
		"latitude": 46.497358,
		"longitude": -1.793528,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 3.312,
		"mhwsAboveChartDatum": 5.43,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 1.55896,
				"phase": 97.2788
			},
			{
				"name": "N2",
				"amplitude": .32495,
				"phase": 77.6139
			},
			{
				"name": "S2",
				"amplitude": .55923,
				"phase": 129.6952
			},
			{
				"name": "K2",
				"amplitude": .15903,
				"phase": 127.2126
			},
			{
				"name": "2N2",
				"amplitude": .04594,
				"phase": 58.4197
			},
			{
				"name": "S1",
				"amplitude": .01016,
				"phase": 17.1385
			},
			{
				"name": "K1",
				"amplitude": .06109,
				"phase": 74.2285
			},
			{
				"name": "P1",
				"amplitude": .02069,
				"phase": 60.6822
			},
			{
				"name": "O1",
				"amplitude": .06897,
				"phase": 326.5622
			},
			{
				"name": "Q1",
				"amplitude": .02155,
				"phase": 281.7791
			},
			{
				"name": "M1",
				"amplitude": .00184,
				"phase": 307.5461
			},
			{
				"name": "M4",
				"amplitude": .15376,
				"phase": 4.6539
			},
			{
				"name": "MM",
				"amplitude": .00694,
				"phase": 242.7499
			},
			{
				"name": "MF",
				"amplitude": .00764,
				"phase": 202.2827
			},
			{
				"name": "SA",
				"amplitude": .05431,
				"phase": 236.6714
			},
			{
				"name": "SSA",
				"amplitude": .02968,
				"phase": 108.3124
			},
			{
				"name": "T2",
				"amplitude": .03061,
				"phase": 123.9163
			},
			{
				"name": "J1",
				"amplitude": .00191,
				"phase": 107.2914
			},
			{
				"name": "L2",
				"amplitude": .03869,
				"phase": 109.7256
			},
			{
				"name": "R2",
				"amplitude": .00639,
				"phase": 132.6243
			},
			{
				"name": "2Q1",
				"amplitude": .00383,
				"phase": 228.1541
			},
			{
				"name": "MSF",
				"amplitude": .00698,
				"phase": 155.9086
			},
			{
				"name": "MSQM",
				"amplitude": .00216,
				"phase": 275.5887
			},
			{
				"name": "EP2",
				"amplitude": .01252,
				"phase": 35.483
			},
			{
				"name": "M3",
				"amplitude": .02486,
				"phase": 335.1604
			},
			{
				"name": "MU2",
				"amplitude": .0536,
				"phase": 58.2478
			},
			{
				"name": "MTM",
				"amplitude": .00157,
				"phase": 178.1297
			},
			{
				"name": "NU2",
				"amplitude": .06132,
				"phase": 80.2195
			},
			{
				"name": "LAMBDA2",
				"amplitude": .00969,
				"phase": 92.583
			},
			{
				"name": "MN4",
				"amplitude": .06979,
				"phase": 316.5246
			},
			{
				"name": "MS4",
				"amplitude": .05868,
				"phase": 85.8464
			},
			{
				"name": "MKS2",
				"amplitude": .00408,
				"phase": 66.4629
			},
			{
				"name": "N4",
				"amplitude": .01639,
				"phase": 261.1795
			},
			{
				"name": "M6",
				"amplitude": .01289,
				"phase": 316.5441
			},
			{
				"name": "M8",
				"amplitude": .00131,
				"phase": 345.5819
			},
			{
				"name": "S4",
				"amplitude": .0022,
				"phase": 220.0648
			},
			{
				"name": "OO1",
				"amplitude": .00136,
				"phase": 232.1649
			},
			{
				"name": "S3",
				"amplitude": .00204,
				"phase": 102.314
			},
			{
				"name": "MA2",
				"amplitude": .0035,
				"phase": 351.2343
			},
			{
				"name": "MB2",
				"amplitude": .00836,
				"phase": 91.0144
			},
			{
				"name": "T3",
				"amplitude": .00729,
				"phase": 125.3059
			},
			{
				"name": "R3",
				"amplitude": .00799,
				"phase": 311.1694
			},
			{
				"name": "RHO1",
				"amplitude": .00375,
				"phase": 288.0359
			},
			{
				"name": "SGM",
				"amplitude": .00443,
				"phase": 63.7076
			},
			{
				"name": "3L2",
				"amplitude": .00721,
				"phase": 274.7374
			},
			{
				"name": "3N2",
				"amplitude": .00174,
				"phase": 311.8647
			},
			{
				"name": "2SM2",
				"amplitude": .00283,
				"phase": 307.7907
			},
			{
				"name": "2MS6",
				"amplitude": .01157,
				"phase": 6.7232
			},
			{
				"name": "2MK5",
				"amplitude": .00234,
				"phase": 155.5677
			},
			{
				"name": "2MO5",
				"amplitude": .00232,
				"phase": 263.6072
			}
		]
	},
	brest: {
		"station": "Brest",
		"sourceId": "brest-822-fra-uhslc_fd",
		"latitude": 48.383,
		"longitude": -4.5,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 4.205,
		"mhwsAboveChartDatum": 7.005,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 2.05094,
				"phase": 108.9171
			},
			{
				"name": "N2",
				"amplitude": .41689,
				"phase": 90.5568
			},
			{
				"name": "S2",
				"amplitude": .74881,
				"phase": 148.2011
			},
			{
				"name": "K2",
				"amplitude": .21361,
				"phase": 145.7985
			},
			{
				"name": "2N2",
				"amplitude": .05694,
				"phase": 72.6799
			},
			{
				"name": "S1",
				"amplitude": .00799,
				"phase": 11.5898
			},
			{
				"name": "K1",
				"amplitude": .06431,
				"phase": 75.0339
			},
			{
				"name": "P1",
				"amplitude": .02252,
				"phase": 63.5936
			},
			{
				"name": "O1",
				"amplitude": .06588,
				"phase": 327.8697
			},
			{
				"name": "Q1",
				"amplitude": .02043,
				"phase": 281.2998
			},
			{
				"name": "M1",
				"amplitude": .00232,
				"phase": 300.1043
			},
			{
				"name": "M4",
				"amplitude": .05448,
				"phase": 105.6994
			},
			{
				"name": "MM",
				"amplitude": .00435,
				"phase": 206.9912
			},
			{
				"name": "MF",
				"amplitude": .01034,
				"phase": 177.4661
			},
			{
				"name": "SA",
				"amplitude": .04944,
				"phase": 245.1037
			},
			{
				"name": "SSA",
				"amplitude": .02049,
				"phase": 99.5596
			},
			{
				"name": "T2",
				"amplitude": .04178,
				"phase": 138.4308
			},
			{
				"name": "J1",
				"amplitude": .00234,
				"phase": 124.4486
			},
			{
				"name": "L2",
				"amplitude": .06385,
				"phase": 102.884
			},
			{
				"name": "R2",
				"amplitude": .00554,
				"phase": 156.5767
			},
			{
				"name": "2Q1",
				"amplitude": .00381,
				"phase": 234.8228
			},
			{
				"name": "MSF",
				"amplitude": .00302,
				"phase": 28.1466
			},
			{
				"name": "MSQM",
				"amplitude": .00134,
				"phase": 253.3924
			},
			{
				"name": "EP2",
				"amplitude": .01961,
				"phase": 89.2185
			},
			{
				"name": "M3",
				"amplitude": .01977,
				"phase": 15.7523
			},
			{
				"name": "MU2",
				"amplitude": .08574,
				"phase": 104.9442
			},
			{
				"name": "MTM",
				"amplitude": .00113,
				"phase": 139.2315
			},
			{
				"name": "NU2",
				"amplitude": .07777,
				"phase": 86.5357
			},
			{
				"name": "LAMBDA2",
				"amplitude": .02628,
				"phase": 75.6941
			},
			{
				"name": "MN4",
				"amplitude": .01941,
				"phase": 60.3272
			},
			{
				"name": "MS4",
				"amplitude": .03268,
				"phase": 181.6023
			},
			{
				"name": "MKS2",
				"amplitude": .00768,
				"phase": 174.756
			},
			{
				"name": "N4",
				"amplitude": .00294,
				"phase": 9.7187
			},
			{
				"name": "M6",
				"amplitude": .03145,
				"phase": 354.5648
			},
			{
				"name": "M8",
				"amplitude": .00231,
				"phase": 231.0809
			},
			{
				"name": "S4",
				"amplitude": .00216,
				"phase": 287.9317
			},
			{
				"name": "OO1",
				"amplitude": .00137,
				"phase": 211.9259
			},
			{
				"name": "S3",
				"amplitude": .003,
				"phase": 149.3942
			},
			{
				"name": "MA2",
				"amplitude": .01077,
				"phase": 40.3618
			},
			{
				"name": "MB2",
				"amplitude": .0124,
				"phase": 102.4386
			},
			{
				"name": "T3",
				"amplitude": .00525,
				"phase": 165.4468
			},
			{
				"name": "R3",
				"amplitude": .00563,
				"phase": 342.1376
			},
			{
				"name": "RHO1",
				"amplitude": .00341,
				"phase": 285.7161
			},
			{
				"name": "SGM",
				"amplitude": .00375,
				"phase": 68.2831
			},
			{
				"name": "3L2",
				"amplitude": .00833,
				"phase": 276.7802
			},
			{
				"name": "3N2",
				"amplitude": .00229,
				"phase": 302.0457
			},
			{
				"name": "2SM2",
				"amplitude": .01732,
				"phase": 311.9068
			},
			{
				"name": "2MS6",
				"amplitude": .01679,
				"phase": 53.0839
			},
			{
				"name": "2MK5",
				"amplitude": .00199,
				"phase": 313.3188
			},
			{
				"name": "2MO5",
				"amplitude": 95e-5,
				"phase": 51.9024
			}
		]
	},
	"saint-malo": {
		"station": "Saint Malo",
		"sourceId": "saint_malo-410-fra-refmar",
		"latitude": 48.640812,
		"longitude": -2.028103,
		"chartDatum": "LAT",
		"mslAboveChartDatum": 6.81,
		"mhwsAboveChartDatum": 11.918,
		"constituents": [
			{
				"name": "M2",
				"amplitude": 3.6737,
				"phase": 177.5339
			},
			{
				"name": "N2",
				"amplitude": .71661,
				"phase": 161.3656
			},
			{
				"name": "S2",
				"amplitude": 1.4344,
				"phase": 227.9097
			},
			{
				"name": "K2",
				"amplitude": .41031,
				"phase": 225.4073
			},
			{
				"name": "2N2",
				"amplitude": .09626,
				"phase": 144.9501
			},
			{
				"name": "S1",
				"amplitude": .01037,
				"phase": 58.899
			},
			{
				"name": "K1",
				"amplitude": .09448,
				"phase": 95.5286
			},
			{
				"name": "P1",
				"amplitude": .03473,
				"phase": 87.7563
			},
			{
				"name": "O1",
				"amplitude": .08163,
				"phase": 344.5218
			},
			{
				"name": "Q1",
				"amplitude": .0242,
				"phase": 302.3439
			},
			{
				"name": "M1",
				"amplitude": .00238,
				"phase": 41.2442
			},
			{
				"name": "M4",
				"amplitude": .26347,
				"phase": 280.2892
			},
			{
				"name": "MM",
				"amplitude": .01387,
				"phase": 220.3476
			},
			{
				"name": "MF",
				"amplitude": .01488,
				"phase": 208.3268
			},
			{
				"name": "SA",
				"amplitude": .06165,
				"phase": 215.0548
			},
			{
				"name": "SSA",
				"amplitude": .02207,
				"phase": 114.8834
			},
			{
				"name": "T2",
				"amplitude": .07691,
				"phase": 214.0296
			},
			{
				"name": "J1",
				"amplitude": .00469,
				"phase": 176.1108
			},
			{
				"name": "L2",
				"amplitude": .16722,
				"phase": 157.2028
			},
			{
				"name": "R2",
				"amplitude": .01442,
				"phase": 260.8548
			},
			{
				"name": "2Q1",
				"amplitude": .00409,
				"phase": 249.0655
			},
			{
				"name": "MSF",
				"amplitude": .01888,
				"phase": 227.2925
			},
			{
				"name": "MSQM",
				"amplitude": .00114,
				"phase": 294.7243
			},
			{
				"name": "EP2",
				"amplitude": .06075,
				"phase": 183.8222
			},
			{
				"name": "M3",
				"amplitude": .03073,
				"phase": 170.3282
			},
			{
				"name": "MU2",
				"amplitude": .25606,
				"phase": 197.3847
			},
			{
				"name": "MTM",
				"amplitude": .00375,
				"phase": 229.3348
			},
			{
				"name": "NU2",
				"amplitude": .1261,
				"phase": 144.525
			},
			{
				"name": "LAMBDA2",
				"amplitude": .09325,
				"phase": 139.6534
			},
			{
				"name": "MN4",
				"amplitude": .09906,
				"phase": 257.5027
			},
			{
				"name": "MS4",
				"amplitude": .19566,
				"phase": 336.4402
			},
			{
				"name": "MKS2",
				"amplitude": .03186,
				"phase": 272.1288
			},
			{
				"name": "N4",
				"amplitude": .0204,
				"phase": 235.6306
			},
			{
				"name": "M6",
				"amplitude": .02211,
				"phase": 341.6085
			},
			{
				"name": "M8",
				"amplitude": .00634,
				"phase": 271.5504
			},
			{
				"name": "S4",
				"amplitude": .02797,
				"phase": 63.0073
			},
			{
				"name": "OO1",
				"amplitude": .00443,
				"phase": 243.8907
			},
			{
				"name": "S3",
				"amplitude": .00219,
				"phase": 331.504
			},
			{
				"name": "MA2",
				"amplitude": .03212,
				"phase": 101.2797
			},
			{
				"name": "MB2",
				"amplitude": .0156,
				"phase": 206.2264
			},
			{
				"name": "T3",
				"amplitude": .00841,
				"phase": 339.9866
			},
			{
				"name": "R3",
				"amplitude": .01226,
				"phase": 183.4659
			},
			{
				"name": "RHO1",
				"amplitude": .00387,
				"phase": 300.8987
			},
			{
				"name": "SGM",
				"amplitude": .00471,
				"phase": 104.0343
			},
			{
				"name": "3L2",
				"amplitude": .016,
				"phase": 339.4682
			},
			{
				"name": "3N2",
				"amplitude": .00326,
				"phase": 44.2161
			},
			{
				"name": "2SM2",
				"amplitude": .08028,
				"phase": 34.093
			},
			{
				"name": "2MS6",
				"amplitude": .02086,
				"phase": 36.513
			},
			{
				"name": "2MK5",
				"amplitude": .00201,
				"phase": 230.229
			},
			{
				"name": "2MO5",
				"amplitude": 6e-4,
				"phase": 269.4448
			}
		]
	}
};
/**
* Provenance des données, affichée telle quelle sous les prévisions.
* `official`/`navigation` sont à `false` : ces prédictions ne sont pas celles
* du SHOM et ne doivent pas servir à la navigation.
*/
var HARMONIC_SOURCE = {
	id: "ticon-4",
	attribution: "Prédictions calculées à partir des constantes harmoniques TICON-4 (analyse harmonique des marégraphes GESLA-4), via la base Neaps, sous licence CC BY 4.0.",
	license: "CC BY 4.0",
	official: false,
	navigation: false
};
/**
* Coefficient de marée : c'est une grandeur *nationale* définie à Brest, pas une
* grandeur locale. On la calcule donc toujours à Brest, quel que soit le port
* affiché.
*
* `BREST_UNIT_M` (unité de hauteur U) est la valeur officielle du SHOM, et il ne
* faut surtout pas la redériver des datums statistiques de la station TICON :
* `mhwsAboveChartDatum - mslAboveChartDatum` donne U ≈ 2,80 m, et le coefficient
* se décale alors d'une dizaine de points par rapport aux annuaires français.
*
* Le niveau moyen, lui, se prend bien dans la station — et c'est contre-intuitif,
* donc mesuré plutôt que supposé. La valeur officielle du SHOM pour Brest est
* 4,03 m, mais les hauteurs que ce module produit sont référencées au datum de la
* station TICON, pas à celui du SHOM ; il faut donc soustraire le niveau moyen
* *de la même référence*, sans quoi on mélange deux verticales.
*
* Vérifié sur les 706 pleines mers de Brest en 2026, contre la définition de
* l'échelle (minimum ~20, vive-eau moyenne 100, maximum ~120, moyenne ~70) :
*
*   NM = 4,03  (officiel SHOM)      min=27  max=113  moyenne=74,9
*   NM = 4,205 (datum station)      min=21  max=108  moyenne=69,2
*
* La seconde tombe sur l'échelle, la première décale tout de ~6 points vers le
* haut. C'est aussi ce que faisait la version en production.
*/
var BREST_UNIT_M = 3.05;
var BREST_MEAN_LEVEL_M = STATIONS.brest.mslAboveChartDatum;
/** Bornes de l'échelle française des coefficients. */
var COEFFICIENT_MIN = 20;
var COEFFICIENT_MAX = 120;
/**
* Écart maximal, en minutes, entre une pleine mer locale et la pleine mer de
* Brest à laquelle on attribue son coefficient. Le décalage réel va de quelques
* minutes (Brest) à un peu plus de deux heures (Saint-Malo), jamais au-delà d'une
* demi-marée.
*/
var COEFFICIENT_MATCH_TOLERANCE_MIN = 240;
var TIMEZONE = "Europe/Paris";
var MINUTE_MS = 6e4;
var HOUR_MS = 36e5;
/** Fenêtre de calcul des extrema : minuit − 12 h … minuit + 36 h. */
var EXTREMA_LOOKBEHIND_H = 12;
var EXTREMA_LOOKAHEAD_H = 36;
var DAY_MINUTES = 1440;
function isHarmonicPort(id) {
	return Object.prototype.hasOwnProperty.call(STATIONS, id);
}
/** Nom du marégraphe utilisé pour ce port, à afficher dans les mentions. */
function harmonicStationName(port) {
	return STATIONS[port].station;
}
/**
* Prédicteurs mémoïsés : leur construction précalcule les corrections nodales des
* 50 composantes, ce qui est trop coûteux pour être refait à chaque rendu.
*/
var predictorCache = /* @__PURE__ */ new Map();
function predictorFor(port) {
	const cached = predictorCache.get(port);
	if (cached) return cached;
	const station = STATIONS[port];
	/**
	* Les constantes harmoniques sont référencées au NIVEAU MOYEN, alors que les
	* tables de marée françaises le sont au ZÉRO HYDROGRAPHIQUE. La remise à
	* niveau passe obligatoirement par l'option `offset` du prédicteur : elle est
	* appliquée avant la recherche des extrema, donc les hauteurs *et* les
	* horaires restent cohérents. Une addition manuelle après coup fausserait les
	* seuils internes de la librairie.
	*
	* (Note : `@neaps/tide-predictor` 0.11 n'a pas d'option `phaseKey` ; les
	* constantes doivent porter la clé `phase`, ce que fait déjà stations.json.)
	*/
	const predictor = createTidePredictor(station.constituents, { offset: station.mslAboveChartDatum });
	predictorCache.set(port, predictor);
	return predictor;
}
/**
* Décalage du fuseau Europe/Paris, en millisecondes, à l'instant donné.
* On le lit via `Intl` plutôt que de le coder en dur : l'app doit rester juste
* de part et d'autre des bascules heure d'été / heure d'hiver.
*/
var PARIS_PARTS = new Intl.DateTimeFormat("en-US", {
	timeZone: TIMEZONE,
	hour12: false,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit"
});
function parisOffsetMs(instant) {
	const parts = Object.fromEntries(PARIS_PARTS.formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
	return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second) - instant.getTime();
}
/**
* Instant UTC correspondant à minuit local à Paris pour un `dateKey`
* `YYYY-MM-DD`.
*
* Deux itérations sont nécessaires : le décalage doit être évalué à l'instant
* cherché, pas à l'instant de départ. Sans cette reprise, les dates situées
* juste après un changement d'heure décaleraient toute la journée d'une heure.
*/
function parisMidnight(dateKey) {
	const utcMidnight = Date.parse(`${dateKey}T00:00:00Z`);
	let candidate = utcMidnight;
	for (let pass = 0; pass < 2; pass += 1) candidate = utcMidnight - parisOffsetMs(new Date(candidate));
	return new Date(candidate);
}
function minutesSince(origin, instant) {
	return Math.round((instant.getTime() - origin.getTime()) / MINUTE_MS);
}
/**
* Pleines et basses mers du jour, en minutes depuis minuit local.
*
* Le calcul déborde volontairement de part et d'autre de la journée (−12 h /
* +36 h) : la marée qui « appartient » visuellement au jour affiché peut tomber
* un peu avant minuit ou un peu après, et l'interface a besoin des voisines pour
* tracer la courbe et enchaîner les jours. Les `minutes` renvoyées peuvent donc
* être négatives ou dépasser 1440 — c'est au consommateur de filtrer s'il ne
* veut que la journée civile.
*/
function predictExtrema(port, dateKey) {
	const midnight = parisMidnight(dateKey);
	const start = new Date(midnight.getTime() - EXTREMA_LOOKBEHIND_H * HOUR_MS);
	const end = new Date(midnight.getTime() + EXTREMA_LOOKAHEAD_H * HOUR_MS);
	return predictorFor(port).getExtremesPrediction({
		start,
		end
	}).map((extreme) => ({
		minutes: minutesSince(midnight, new Date(extreme.time)),
		heightM: Number(extreme.level.toFixed(2)),
		kind: extreme.high ? "Pleine mer" : "Basse mer"
	})).sort((a, b) => a.minutes - b.minutes);
}
/**
* Coefficients de marée de Brest pour la journée, indexés par l'heure (en
* minutes locales) de la pleine mer correspondante.
*/
function brestCoefficientsByMinute(dateKey) {
	const byMinute = /* @__PURE__ */ new Map();
	for (const extremum of predictExtrema("brest", dateKey)) {
		if (extremum.kind !== "Pleine mer") continue;
		const raw = Math.round((extremum.heightM - BREST_MEAN_LEVEL_M) / BREST_UNIT_M * 100);
		byMinute.set(extremum.minutes, Math.max(COEFFICIENT_MIN, Math.min(COEFFICIENT_MAX, raw)));
	}
	return byMinute;
}
/**
* Coefficients des pleines mers de la journée civile pour le port demandé.
*
* Le coefficient n'est pas recalculé localement : on reprend celui de la pleine
* mer de Brest la plus proche dans le temps, ce qui reproduit la façon dont les
* annuaires français rattachent une marée locale au coefficient du jour.
*/
function predictCoefficients(port, dateKey) {
	const brest = brestCoefficientsByMinute(dateKey);
	const coefficients = [];
	for (const extremum of predictExtrema(port, dateKey)) {
		if (extremum.kind !== "Pleine mer") continue;
		if (extremum.minutes < 0 || extremum.minutes >= DAY_MINUTES) continue;
		let best = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const [minutes, coefficient] of brest) {
			const distance = Math.abs(minutes - extremum.minutes);
			if (distance < bestDistance) {
				bestDistance = distance;
				best = coefficient;
			}
		}
		if (best !== null && bestDistance <= COEFFICIENT_MATCH_TOLERANCE_MIN) coefficients.push(best);
	}
	return coefficients;
}
//#endregion
//#region app/page.tsx
var tideTemplate = [
	{
		minutes: -126,
		height: 4,
		kind: "Pleine mer",
		coefficient: 78
	},
	{
		minutes: 208,
		height: 1.1,
		kind: "Basse mer",
		coefficient: null
	},
	{
		minutes: 582,
		height: 3.9,
		kind: "Pleine mer",
		coefficient: 78
	},
	{
		minutes: 958,
		height: 1.3,
		kind: "Basse mer",
		coefficient: null
	},
	{
		minutes: 1334,
		height: 4.1,
		kind: "Pleine mer",
		coefficient: 77
	},
	{
		minutes: 1708,
		height: 1.2,
		kind: "Basse mer",
		coefficient: null
	}
];
var ports = [
	{
		id: "biarritz",
		name: "Biarritz",
		area: "Côte basque",
		demoCoefficient: 78,
		timeShift: 0,
		heightFactor: 1,
		heightOffset: 0
	},
	{
		id: "saint-jean-de-luz",
		name: "Saint-Jean-de-Luz",
		area: "Côte basque",
		demoCoefficient: 77,
		timeShift: -18,
		heightFactor: .96,
		heightOffset: -.04
	},
	{
		id: "capbreton",
		name: "Capbreton",
		area: "Landes",
		demoCoefficient: 76,
		timeShift: 14,
		heightFactor: .92,
		heightOffset: -.04
	},
	{
		id: "arcachon",
		name: "Arcachon",
		area: "Bassin d’Arcachon",
		demoCoefficient: 72,
		timeShift: 42,
		heightFactor: .82,
		heightOffset: -.12
	},
	{
		id: "la-rochelle",
		name: "La Rochelle",
		area: "Charente-Maritime",
		demoCoefficient: 82,
		timeShift: 68,
		heightFactor: 1.15,
		heightOffset: .02
	},
	{
		id: "les-sables",
		name: "Les Sables-d’Olonne",
		area: "Vendée",
		demoCoefficient: 80,
		timeShift: 54,
		heightFactor: 1.08,
		heightOffset: 0
	},
	{
		id: "brest",
		name: "Brest",
		area: "Finistère",
		demoCoefficient: 93,
		timeShift: 92,
		heightFactor: 1.38,
		heightOffset: .12
	},
	{
		id: "saint-malo",
		name: "Saint-Malo",
		area: "Ille-et-Vilaine",
		demoCoefficient: 104,
		timeShift: 138,
		heightFactor: 1.68,
		heightOffset: .18
	}
];
var coefficientDeltas = [
	0,
	-4,
	-10,
	-17,
	-24,
	-30,
	-35
];
var waterLevelMin = 33;
var waterLevelSpan = 13;
var highMarkTop = 100 - (waterLevelMin + waterLevelSpan);
var lowMarkTop = 100 - waterLevelMin;
function clamp(value, minimum = 0, maximum = 1) {
	return Math.max(minimum, Math.min(maximum, value));
}
function springEasing(distance, velocity, duration) {
	if (Math.abs(distance) < 1) return null;
	const initialVelocity = clamp(velocity * duration / distance, -3, 14);
	const curve = (progress) => 1 - (1 + (8 - initialVelocity) * progress) * Math.exp(-8 * progress);
	const normalizer = curve(1);
	if (!Number.isFinite(normalizer) || normalizer <= 0) return null;
	const stops = [];
	for (let step = 0; step <= 24; step += 1) stops.push((curve(step / 24) / normalizer).toFixed(4));
	return `linear(${stops.join(", ")})`;
}
function Icon({ name, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `ui-icon ui-icon-${name} ${className}`.trim(),
		"aria-hidden": "true"
	});
}
function buildTidePoints(portId, dateKey, port) {
	if (!isHarmonicPort(portId)) return buildDemoTidePoints(port);
	const coefficients = predictCoefficients(portId, dateKey);
	let highTideIndex = 0;
	return predictExtrema(portId, dateKey).map((point) => {
		const withinDay = point.minutes >= 0 && point.minutes < 1440;
		const coefficient = point.kind === "Pleine mer" && withinDay ? coefficients[highTideIndex++] ?? null : null;
		return {
			minutes: point.minutes,
			height: point.heightM,
			kind: point.kind,
			coefficient
		};
	});
}
function buildForecast(portId, startDate, port, demoVisibleTides) {
	if (!isHarmonicPort(portId)) return buildDemoForecast(startDate, port, demoVisibleTides);
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(startDate);
		date.setDate(startDate.getDate() + index);
		const tides = buildTidePoints(portId, localDateKey(date), port).filter((point) => point.minutes >= 0 && point.minutes < 1440);
		return {
			date,
			coefficients: tides.map((point) => point.coefficient).filter((coefficient) => coefficient !== null),
			tides
		};
	});
}
function buildDemoTidePoints(port) {
	const core = tideTemplate.map((point) => ({
		...point,
		minutes: point.minutes + port.timeShift,
		height: Number(Math.max(.4, point.height * port.heightFactor + port.heightOffset).toFixed(1)),
		coefficient: point.kind === "Pleine mer" ? Math.max(20, Math.min(120, port.demoCoefficient + (point.coefficient ?? 78) - 78)) : null
	}));
	const first = core[0];
	const second = core[1];
	const penultimate = core[core.length - 2];
	const last = core[core.length - 1];
	return [
		{
			minutes: first.minutes - (second.minutes - first.minutes),
			height: second.height,
			kind: second.kind,
			coefficient: second.coefficient
		},
		...core,
		{
			minutes: last.minutes + (last.minutes - penultimate.minutes),
			height: penultimate.height,
			kind: penultimate.kind,
			coefficient: penultimate.coefficient
		}
	];
}
function buildDemoForecast(startDate, port, visibleTides) {
	const start = new Date(startDate);
	return coefficientDeltas.map((delta, index) => {
		const date = new Date(start);
		date.setDate(start.getDate() + index);
		const shift = index * 48;
		return {
			date,
			coefficients: [Math.max(20, Math.min(120, port.demoCoefficient + delta))],
			tides: visibleTides.map((point) => ({
				...point,
				minutes: (point.minutes + shift) % 1440,
				coefficient: point.kind === "Pleine mer" ? Math.max(20, Math.min(120, port.demoCoefficient + delta)) : null,
				height: Number(Math.max(.4, point.height + (point.kind === "Pleine mer" ? -index * .08 * port.heightFactor : index * .035 * port.heightFactor)).toFixed(1))
			})).sort((a, b) => a.minutes - b.minutes)
		};
	});
}
function localDateKey(date) {
	return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}
function localDateFromKey(value) {
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day, 12, 0, 0, 0);
}
function minutesFromTime(value) {
	const [hours, minutes] = value.split(":").map(Number);
	return hours * 60 + minutes;
}
function minutesFromLevelTime(value) {
	const match = /T(\d{2}):(\d{2})/.exec(value);
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
function coefficientsLabel(coefficients) {
	const unique = [...new Set(coefficients)].sort((left, right) => left - right);
	if (!unique.length) return "—";
	if (unique.length === 1) return String(unique[0]);
	return `${unique[0]}–${unique[unique.length - 1]}`;
}
function buildLiveForecast(payload) {
	return Array.from({ length: payload.period.days }, (_, index) => {
		const date = localDateFromKey(payload.period.start);
		date.setDate(date.getDate() + index);
		const key = localDateKey(date);
		const extrema = payload.extrema.filter((point) => point.date === key);
		return {
			date,
			coefficients: extrema.filter((point) => point.type === "high" && point.coefficient !== null).map((point) => point.coefficient),
			tides: extrema.map((point) => ({
				minutes: minutesFromTime(point.time),
				height: point.heightM,
				kind: point.type === "high" ? "Pleine mer" : "Basse mer",
				coefficient: point.type === "high" ? point.coefficient : null
			}))
		};
	});
}
function getLiveTideAt(minutes, levels, events) {
	const samples = levels.map((sample) => ({
		minutes: minutesFromLevelTime(sample.time),
		height: sample.heightM
	})).filter((sample) => sample.minutes !== null).sort((left, right) => left.minutes - right.minutes);
	if (samples.length < 2) return null;
	const nextSampleIndex = samples.findIndex((sample) => sample.minutes >= minutes);
	const endIndex = nextSampleIndex <= 0 ? 1 : nextSampleIndex === -1 ? samples.length - 1 : nextSampleIndex;
	const start = samples[endIndex - 1];
	const end = samples[endIndex];
	const progress = Math.max(0, Math.min(1, (minutes - start.minutes) / Math.max(1, end.minutes - start.minutes)));
	const height = start.height + (end.height - start.height) * progress;
	const next = events.find((point) => point.minutes >= minutes) ?? events[events.length - 1];
	if (!next) return null;
	return {
		height,
		rising: next.kind === "Pleine mer",
		next,
		minutesUntilNext: Math.max(0, next.minutes - minutes)
	};
}
function normalizeSearch(value) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").trim();
}
function formatTime(minutes) {
	const normalized = (minutes % 1440 + 1440) % 1440;
	const hours = Math.floor(normalized / 60);
	const mins = normalized % 60;
	return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
function formatHeight(value) {
	return value.toFixed(1).replace(".", ",");
}
function formatDuration(minutes) {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours === 0) return `${mins} min`;
	return `${hours} h ${mins.toString().padStart(2, "0")}`;
}
function getParisClock(now = /* @__PURE__ */ new Date()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Paris",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).formatToParts(now);
	const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
	const minutes = (values.hour * 60 + values.minute) % 1440;
	return {
		date: new Date(values.year, values.month - 1, values.day, 12, 0, 0, 0),
		minutes
	};
}
function getTideAt(minutes, tidePoints) {
	const startIndex = tidePoints.findIndex((point, index) => index < tidePoints.length - 1 && minutes >= point.minutes && minutes <= tidePoints[index + 1].minutes);
	const index = startIndex === -1 ? 0 : startIndex;
	const start = tidePoints[index];
	const end = tidePoints[index + 1];
	const progress = Math.max(0, Math.min(1, (minutes - start.minutes) / (end.minutes - start.minutes)));
	const eased = (1 - Math.cos(progress * Math.PI)) / 2;
	return {
		height: start.height + (end.height - start.height) * eased,
		rising: end.kind === "Pleine mer",
		next: end,
		minutesUntilNext: Math.max(0, end.minutes - minutes)
	};
}
function Home() {
	const [minutes, setMinutes] = (0, import_react.useState)(720);
	const [currentDate, setCurrentDate] = (0, import_react.useState)(() => new Date(2026, 7, 3, 12, 0, 0, 0));
	const [liveMinutes, setLiveMinutes] = (0, import_react.useState)(720);
	const [isFollowingLive, setIsFollowingLive] = (0, import_react.useState)(true);
	const [isPlaying, setIsPlaying] = (0, import_react.useState)(false);
	const [isUnderwater, setIsUnderwater] = (0, import_react.useState)(false);
	const [selectedDay, setSelectedDay] = (0, import_react.useState)(0);
	const [selectedPortId, setSelectedPortId] = (0, import_react.useState)("biarritz");
	const [portQuery, setPortQuery] = (0, import_react.useState)("");
	const [portAnnouncement, setPortAnnouncement] = (0, import_react.useState)("");
	const [tidesPayload, setTidesPayload] = (0, import_react.useState)(null);
	const [tideLoadState, setTideLoadState] = (0, import_react.useState)("loading");
	const [tideAnnouncement, setTideAnnouncement] = (0, import_react.useState)("Connexion à la source de marée…");
	const [shoreMotion, setShoreMotion] = (0, import_react.useState)(null);
	const portDialogRef = (0, import_react.useRef)(null);
	const shomDialogRef = (0, import_react.useRef)(null);
	const portSearchRef = (0, import_react.useRef)(null);
	const locationButtonRef = (0, import_react.useRef)(null);
	const forecastButtonRef = (0, import_react.useRef)(null);
	const backButtonRef = (0, import_react.useRef)(null);
	const lastShomTriggerRef = (0, import_react.useRef)(null);
	const phoneRef = (0, import_react.useRef)(null);
	const screenStackRef = (0, import_react.useRef)(null);
	const waterRef = (0, import_react.useRef)(null);
	const disturbanceTimerRef = (0, import_react.useRef)(null);
	const disturbanceStartedAtRef = (0, import_react.useRef)(null);
	const shoreMotionTimerRef = (0, import_react.useRef)(null);
	const shoreMotionIdRef = (0, import_react.useRef)(0);
	const sliderStartMinutesRef = (0, import_react.useRef)(720);
	const screenDragRef = (0, import_react.useRef)(null);
	const suppressForecastClickRef = (0, import_react.useRef)(false);
	const forecastClickResetTimerRef = (0, import_react.useRef)(null);
	const selectedPort = (0, import_react.useMemo)(() => ports.find((port) => port.id === selectedPortId) ?? ports[0], [selectedPortId]);
	const currentDateKey = localDateKey(currentDate);
	const localTidePoints = (0, import_react.useMemo)(() => buildTidePoints(selectedPortId, currentDateKey, selectedPort), [
		currentDateKey,
		selectedPort,
		selectedPortId
	]);
	const localVisibleTides = (0, import_react.useMemo)(() => localTidePoints.filter((point) => point.minutes >= 0 && point.minutes < 1440), [localTidePoints]);
	const localForecast = (0, import_react.useMemo)(() => buildForecast(selectedPortId, currentDate, selectedPort, localVisibleTides), [
		currentDate,
		selectedPort,
		selectedPortId,
		localVisibleTides
	]);
	const liveForecast = (0, import_react.useMemo)(() => tidesPayload ? buildLiveForecast(tidesPayload) : null, [tidesPayload]);
	const hasLiveData = tideLoadState === "live" && liveForecast !== null;
	const forecast = hasLiveData ? liveForecast : localForecast;
	const visibleTides = hasLiveData && forecast[0]?.tides.length ? forecast[0].tides : localVisibleTides;
	const liveLevelsToday = (0, import_react.useMemo)(() => hasLiveData ? tidesPayload?.levels.filter((point) => point.time.slice(0, 10) === currentDateKey) ?? [] : [], [
		currentDateKey,
		hasLiveData,
		tidesPayload
	]);
	const eventTimeline = (0, import_react.useMemo)(() => {
		if (!hasLiveData) return localTidePoints;
		const todayEvents = forecast[0]?.tides ?? [];
		const tomorrowEvents = (forecast[1]?.tides ?? []).map((point) => ({
			...point,
			minutes: point.minutes + 1440
		}));
		return [...todayEvents, ...tomorrowEvents];
	}, [
		localTidePoints,
		forecast,
		hasLiveData
	]);
	const filteredPorts = (0, import_react.useMemo)(() => {
		const query = normalizeSearch(portQuery);
		if (!query) return ports;
		return ports.filter((port) => normalizeSearch(`${port.name} ${port.area}`).includes(query));
	}, [portQuery]);
	(0, import_react.useEffect)(() => {
		let savedPort = null;
		try {
			savedPort = window.localStorage.getItem("maree.selected-port");
		} catch {}
		const frame = window.requestAnimationFrame(() => {
			const savedPortConfig = ports.find((port) => port.id === savedPort);
			if (savedPortConfig) setSelectedPortId(savedPortConfig.id);
		});
		return () => window.cancelAnimationFrame(frame);
	}, []);
	(0, import_react.useEffect)(() => {
		function syncClock() {
			const parisClock = getParisClock();
			setLiveMinutes(parisClock.minutes);
			if (isFollowingLive) setMinutes(parisClock.minutes);
			setCurrentDate(parisClock.date);
		}
		const frame = window.requestAnimationFrame(syncClock);
		const timer = window.setInterval(syncClock, 3e4);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearInterval(timer);
		};
	}, [isFollowingLive]);
	(0, import_react.useEffect)(() => {
		const controller = new AbortController();
		async function loadTides() {
			try {
				const response = await fetch(`/api/tides?port=${encodeURIComponent(selectedPortId)}&start=${currentDateKey}&days=7`, {
					signal: controller.signal,
					headers: { accept: "application/json" }
				});
				const result = await response.json();
				if (!response.ok) throw new Error(result?.error?.code ?? "upstream_unavailable");
				const payload = result;
				if (!payload.extrema.length || payload.levels.length < 2) throw new Error("empty_payload");
				setTidesPayload(payload);
				setTideLoadState("live");
				setTideAnnouncement(`Données de marée chargées pour ${selectedPort.name}, fournies par api-maree.fr.`);
			} catch (error) {
				if (controller.signal.aborted) return;
				setTidesPayload(null);
				const unconfigured = error instanceof Error && error.message === "service_unconfigured";
				const keyRejected = error instanceof Error && error.message === "service_key_rejected";
				setTideLoadState(unconfigured ? "demo" : "unavailable");
				setTideAnnouncement(isHarmonicPort(selectedPortId) ? `Horaires calculés sur l’appareil à partir des constantes harmoniques de ${harmonicStationName(selectedPortId)}. Les horaires officiels SHOM restent disponibles.` : unconfigured ? "Horaires fictifs : aucune source de marée n’est configurée. Les horaires officiels SHOM sont disponibles." : keyRejected ? "Horaires fictifs : la source de marée refuse la clé de ce déploiement. Les horaires officiels SHOM restent disponibles." : "Horaires fictifs : la source de marée est momentanément indisponible. Les horaires officiels SHOM restent disponibles.");
			}
		}
		const frame = window.requestAnimationFrame(() => {
			setTidesPayload(null);
			setSelectedDay(0);
			if (selectedPortId === "capbreton") {
				setTideLoadState("demo");
				setTideAnnouncement(`Horaires calculés sur l’appareil à partir des constantes harmoniques de ${harmonicStationName("capbreton")}. Les horaires officiels SHOM restent disponibles.`);
				return;
			}
			setTideLoadState("loading");
			setTideAnnouncement(`Connexion aux données de marée pour ${selectedPort.name}…`);
			loadTides();
		});
		return () => {
			window.cancelAnimationFrame(frame);
			controller.abort();
		};
	}, [
		currentDateKey,
		selectedPort.name,
		selectedPortId
	]);
	(0, import_react.useEffect)(() => {
		if (!isPlaying) return;
		const timer = window.setInterval(() => {
			setMinutes((current) => (current + 10) % 1440);
		}, 140);
		return () => window.clearInterval(timer);
	}, [isPlaying]);
	(0, import_react.useEffect)(() => () => {
		if (disturbanceTimerRef.current !== null) window.clearTimeout(disturbanceTimerRef.current);
		if (shoreMotionTimerRef.current !== null) window.clearTimeout(shoreMotionTimerRef.current);
	}, []);
	const tide = (0, import_react.useMemo)(() => (hasLiveData ? getLiveTideAt(minutes, liveLevelsToday, eventTimeline) : null) ?? getTideAt(minutes, localTidePoints), [
		localTidePoints,
		eventTimeline,
		hasLiveData,
		liveLevelsToday,
		minutes
	]);
	const dayCycle = (0, import_react.useMemo)(() => getDayCycle(minutes), [minutes]);
	const tideRange = (0, import_react.useMemo)(() => {
		const heights = hasLiveData && liveLevelsToday.length ? liveLevelsToday.map((point) => point.heightM) : localTidePoints.map((point) => point.height);
		return {
			min: Math.min(...heights),
			max: Math.max(...heights)
		};
	}, [
		localTidePoints,
		hasLiveData,
		liveLevelsToday
	]);
	const rangeSpan = Math.max(.5, tideRange.max - tideRange.min);
	const tideProgress = clamp((tide.height - tideRange.min) / rangeSpan);
	const waterShift = (84 - (waterLevelMin + tideProgress * waterLevelSpan)) / 84 * 100;
	const beachExposure = clamp((.92 - tideProgress) / .72);
	const isDarkScene = dayCycle.night >= .32;
	const birdLight = clamp(1 - dayCycle.night * 2.1);
	const sandDryness = clamp((.82 - tideProgress) / .6) * (tide.rising ? clamp(.95 - tideProgress * .55) : 1);
	const visitorPresence = clamp(.35 + beachExposure * .65) * birdLight;
	const tideScene = tideProgress <= .34 ? "low" : tideProgress >= .66 ? "high" : tide.rising ? "departing" : "arriving";
	const beachLife = birdLight < .16 || beachExposure <= .22 ? "hidden" : tide.rising ? "leaving" : beachExposure >= .62 ? "settled" : "arriving";
	const birdState = birdLight < .16 ? "hidden" : tide.rising ? tideProgress >= .84 ? "hidden" : tideProgress >= .38 ? "flying-out" : "landed" : tideProgress >= .82 ? "hidden" : tideProgress >= .42 ? "flying-in" : "landed";
	const today = new Intl.DateTimeFormat("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(currentDate);
	const activeForecast = forecast[selectedDay] ?? forecast[0];
	const coefficientEvents = eventTimeline.filter((point) => point.kind === "Pleine mer" && point.coefficient !== null);
	const currentCoefficient = (coefficientEvents.find((point) => point.minutes >= minutes) ?? coefficientEvents[coefficientEvents.length - 1])?.coefficient ?? null;
	const harmonicStation = isHarmonicPort(selectedPortId) ? harmonicStationName(selectedPortId) : null;
	const isComputed = !hasLiveData && harmonicStation !== null;
	const sourceLabel = tideLoadState === "live" ? "api-maree.fr" : tideLoadState === "loading" ? "Connexion…" : isComputed ? "Calculé" : "Horaires fictifs";
	const atmosphereStyle = {
		"--daylight": dayCycle.daylight.toFixed(3),
		"--night": dayCycle.night.toFixed(3),
		"--dawn": dayCycle.dawn.toFixed(3),
		"--dusk": dayCycle.dusk.toFixed(3),
		"--twilight": dayCycle.twilight.toFixed(3),
		"--moonlight": dayCycle.moonlight.toFixed(3),
		"--sun-x": dayCycle.sunX.toFixed(2),
		"--sun-y": dayCycle.sunY.toFixed(2),
		"--moon-x": dayCycle.moonX.toFixed(2),
		"--moon-y": dayCycle.moonY.toFixed(2),
		"--water-shift": `${waterShift}%`,
		"--tide-progress": tideProgress.toFixed(3),
		"--beach-exposure": beachExposure.toFixed(3),
		"--sand-dryness": sandDryness.toFixed(3),
		"--visitor-presence": visitorPresence.toFixed(3)
	};
	(0, import_react.useEffect)(() => {
		const night = dayCycle.night;
		const twilight = dayCycle.twilight;
		const mix = (day, dusk, dark) => Math.round(day * (1 - night - twilight * .5) + dusk * twilight * .5 + dark * night);
		const skyColor = `rgb(${mix(168, 196, 10)}, ${mix(207, 150, 23)}, ${mix(224, 150, 48)})`;
		document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", skyColor);
		const blend = (light, dark) => `rgb(${light.map((channel, index) => Math.round(channel + (dark[index] - channel) * night)).join(", ")})`;
		const groundColor = isUnderwater ? blend([
			189,
			160,
			111
		], [
			98,
			90,
			77
		]) : blend([
			10,
			80,
			116
		], [
			6,
			34,
			58
		]);
		document.documentElement.style.backgroundColor = groundColor;
		document.body.style.backgroundColor = groundColor;
	}, [
		dayCycle.night,
		dayCycle.twilight,
		isUnderwater
	]);
	(0, import_react.useEffect)(() => {
		const water = waterRef.current;
		if (!water) return;
		const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		let lastPaint = 0;
		const frameInterval = 1e3 / 30;
		const setCalmPose = () => {
			water.style.setProperty("--foam-x", "0%");
			water.style.setProperty("--foam-y", "0px");
			water.style.setProperty("--foam-scale", "1");
		};
		const animate = (now) => {
			frame = 0;
			if (document.hidden || motionPreference.matches || isUnderwater) {
				setCalmPose();
				return;
			}
			if (now - lastPaint < frameInterval) {
				frame = window.requestAnimationFrame(animate);
				return;
			}
			lastPaint = now;
			const time = now / 1e3;
			const disturbanceAge = disturbanceStartedAtRef.current === null ? Number.POSITIVE_INFINITY : Math.max(0, (now - disturbanceStartedAtRef.current) / 1e3);
			const burst = (disturbanceAge < 1.05 ? Math.exp(-3.15 * disturbanceAge) * (1 - Math.exp(-28 * disturbanceAge)) : 0) * (Math.sin(disturbanceAge * 29) * .74 + Math.sin(disturbanceAge * 47 + .8) * .26);
			const swell = Math.sin(time * .92) * .72 + Math.sin(time * 1.47 + 1.4) * .28;
			water.style.setProperty("--foam-x", `${(swell * .8 + burst * 2.8).toFixed(2)}%`);
			water.style.setProperty("--foam-y", `${(swell * -1.2 + burst * -3.2).toFixed(2)}px`);
			water.style.setProperty("--foam-scale", `${(1 + swell * .012 + Math.abs(burst) * .055).toFixed(3)}`);
			frame = window.requestAnimationFrame(animate);
		};
		const start = () => {
			if (!frame && !document.hidden && !motionPreference.matches && !isUnderwater) frame = window.requestAnimationFrame(animate);
		};
		const stop = () => {
			if (frame) window.cancelAnimationFrame(frame);
			frame = 0;
			lastPaint = 0;
			setCalmPose();
		};
		const handleVisibility = () => {
			if (document.hidden) stop();
			else start();
		};
		const handleMotionPreference = () => {
			if (motionPreference.matches) stop();
			else start();
		};
		document.addEventListener("visibilitychange", handleVisibility);
		motionPreference.addEventListener("change", handleMotionPreference);
		start();
		return () => {
			stop();
			document.removeEventListener("visibilitychange", handleVisibility);
			motionPreference.removeEventListener("change", handleMotionPreference);
		};
	}, [isUnderwater]);
	function agitateWater() {
		const water = waterRef.current;
		if (!water || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		water.classList.remove("is-disturbed");
		water.offsetWidth;
		water.classList.add("is-disturbed");
		disturbanceStartedAtRef.current = window.performance.now();
		if (disturbanceTimerRef.current !== null) window.clearTimeout(disturbanceTimerRef.current);
		disturbanceTimerRef.current = window.setTimeout(() => {
			water.classList.remove("is-disturbed");
			disturbanceTimerRef.current = null;
		}, 1050);
	}
	function triggerShoreMotion(kind, atMinutes) {
		if (getDayCycle(atMinutes).phase === "night" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setShoreMotion(null);
			return;
		}
		shoreMotionIdRef.current += 1;
		setShoreMotion({
			kind,
			id: shoreMotionIdRef.current
		});
		if (shoreMotionTimerRef.current !== null) window.clearTimeout(shoreMotionTimerRef.current);
		shoreMotionTimerRef.current = window.setTimeout(() => {
			setShoreMotion(null);
			shoreMotionTimerRef.current = null;
		}, 1550);
	}
	function signalShoreMotionAt(atMinutes) {
		triggerShoreMotion(((hasLiveData ? getLiveTideAt(atMinutes, liveLevelsToday, eventTimeline) : null) ?? getTideAt(atMinutes, localTidePoints)).rising ? "leaving" : "arriving", atMinutes);
	}
	function jumpToTide(point) {
		setIsPlaying(false);
		setIsFollowingLive(false);
		setMinutes(point.minutes);
		agitateWater();
		triggerShoreMotion(point.kind === "Basse mer" ? "arriving" : "leaving", point.minutes);
	}
	function returnToLive() {
		const parisClock = getParisClock();
		const difference = Math.abs(parisClock.minutes - minutes);
		setIsPlaying(false);
		setIsFollowingLive(true);
		setLiveMinutes(parisClock.minutes);
		setMinutes(parisClock.minutes);
		setSelectedDay(0);
		setCurrentDate(parisClock.date);
		if (Math.min(difference, 1440 - difference) >= 30) {
			agitateWater();
			signalShoreMotionAt(parisClock.minutes);
		}
	}
	function openPortPicker(focusSearch = false) {
		setIsPlaying(false);
		setPortQuery("");
		portDialogRef.current?.showModal();
		window.requestAnimationFrame(() => {
			if (focusSearch) portSearchRef.current?.focus();
			else portDialogRef.current?.focus();
		});
	}
	function closePortPicker() {
		if (portDialogRef.current?.open) portDialogRef.current.close();
	}
	function openShomWidget(trigger) {
		setIsPlaying(false);
		lastShomTriggerRef.current = trigger;
		shomDialogRef.current?.showModal();
	}
	function closeShomWidget() {
		if (shomDialogRef.current?.open) shomDialogRef.current.close();
	}
	function choosePort(port) {
		setSelectedPortId(port.id);
		setSelectedDay(0);
		setIsPlaying(false);
		setPortAnnouncement(`Port sélectionné : ${port.name}`);
		try {
			window.localStorage.setItem("maree.selected-port", port.id);
		} catch {}
		closePortPicker();
	}
	function showForecast(moveFocus = true) {
		setIsPlaying(false);
		setIsUnderwater(true);
		window.requestAnimationFrame(() => {
			if (phoneRef.current) phoneRef.current.scrollTop = 0;
			if (moveFocus) backButtonRef.current?.focus({ preventScroll: true });
		});
	}
	function hideForecast(moveFocus = true) {
		setIsUnderwater(false);
		window.requestAnimationFrame(() => {
			if (phoneRef.current) phoneRef.current.scrollTop = 0;
			if (moveFocus) forecastButtonRef.current?.focus({ preventScroll: true });
		});
	}
	function readTranslateY(element) {
		const transform = window.getComputedStyle(element).transform;
		if (transform === "none") return 0;
		try {
			return new DOMMatrixReadOnly(transform).m42;
		} catch {
			const values = transform.slice(transform.indexOf("(") + 1, transform.lastIndexOf(")")).split(",").map(Number);
			return values.length === 6 ? values[5] : values[13] ?? 0;
		}
	}
	function resetScreenDrag(duration = 360, easing = null) {
		const stack = screenStackRef.current;
		if (!stack) return;
		stack.style.setProperty("--screen-settle-duration", `${duration}ms`);
		if (easing) stack.style.setProperty("--screen-settle-easing", easing);
		else stack.style.removeProperty("--screen-settle-easing");
		window.requestAnimationFrame(() => {
			stack.classList.remove("is-dragging");
			stack.style.removeProperty("--drag-position");
		});
	}
	function suppressForecastClick() {
		suppressForecastClickRef.current = true;
		if (forecastClickResetTimerRef.current !== null) window.clearTimeout(forecastClickResetTimerRef.current);
		forecastClickResetTimerRef.current = window.setTimeout(() => {
			suppressForecastClickRef.current = false;
			forecastClickResetTimerRef.current = null;
		}, 450);
	}
	function handleScreenSwipeStart(event) {
		if (event.pointerType !== "touch" || !event.isPrimary || portDialogRef.current?.open || shomDialogRef.current?.open) return;
		const target = event.target;
		const forecastHandle = target.closest("[data-screen-swipe-handle]");
		if (target.closest("button, input, select, textarea, a, dialog, [contenteditable], [data-no-screen-swipe]") && !forecastHandle) return;
		const bounds = phoneRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
		if (event.clientY - bounds.top < 20 || bounds.bottom - event.clientY < 20) return;
		const startTranslateY = readTranslateY(event.currentTarget);
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		screenDragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			startTranslateY,
			lastY: event.clientY,
			lastTime: event.timeStamp,
			velocityY: 0,
			currentY: startTranslateY,
			axis: "pending",
			startedUnderwater: isUnderwater,
			startedFromForecastHandle: Boolean(forecastHandle),
			reduceMotion
		};
		event.currentTarget.style.setProperty("--drag-position", `${startTranslateY}px`);
		event.currentTarget.classList.add("is-dragging");
	}
	function handleScreenSwipeMove(event) {
		const drag = screenDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		const deltaX = event.clientX - drag.startX;
		const deltaY = event.clientY - drag.startY;
		if (drag.axis === "pending") {
			if (Math.hypot(deltaX, deltaY) < 10) return;
			if (Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
				if (drag.startedFromForecastHandle) suppressForecastClick();
				screenDragRef.current = null;
				if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
				resetScreenDrag();
				return;
			}
			drag.axis = "vertical";
			if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
		}
		const phoneHeight = phoneRef.current?.clientHeight ?? event.currentTarget.clientHeight / 2;
		const nextY = Math.max(-phoneHeight, Math.min(0, drag.startTranslateY + deltaY));
		const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
		const instantVelocity = (event.clientY - drag.lastY) / elapsed;
		drag.velocityY = drag.velocityY * .65 + instantVelocity * .35;
		drag.lastY = event.clientY;
		drag.lastTime = event.timeStamp;
		drag.currentY = nextY;
		if (!drag.reduceMotion) event.currentTarget.style.setProperty("--drag-position", `${nextY}px`);
	}
	function finishScreenSwipe(event, cancelled = false) {
		const drag = screenDragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		const phoneHeight = phoneRef.current?.clientHeight ?? event.currentTarget.clientHeight / 2;
		const deltaY = event.clientY - drag.startY;
		const currentY = Math.max(-phoneHeight, Math.min(0, drag.startTranslateY + deltaY));
		const progress = Math.max(0, Math.min(1, -currentY / phoneHeight));
		const projected = Math.max(0, Math.min(1, progress - drag.velocityY * 180 / phoneHeight));
		const distance = Math.abs(deltaY);
		const enteredUnderwater = !cancelled && drag.axis === "vertical" && !drag.startedUnderwater && (progress >= .28 || projected >= .34 || drag.startedFromForecastHandle && deltaY <= -12 || distance >= 18 && drag.velocityY <= -.55);
		const returnedToSurface = !cancelled && drag.axis === "vertical" && drag.startedUnderwater && (progress <= .72 || projected <= .66 || distance >= 18 && drag.velocityY >= .55);
		const nextUnderwater = enteredUnderwater ? true : returnedToSurface ? false : drag.startedUnderwater;
		const settleDuration = drag.reduceMotion ? 1 : Math.round(Math.max(220, Math.min(420, 410 - Math.abs(drag.velocityY) * 150)));
		const settleTarget = nextUnderwater ? -phoneHeight : 0;
		const settleEasing = drag.reduceMotion ? null : springEasing(settleTarget - currentY, drag.velocityY, settleDuration);
		if (drag.startedFromForecastHandle && distance >= 10 && nextUnderwater !== drag.startedUnderwater) suppressForecastClick();
		screenDragRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		if (nextUnderwater !== isUnderwater) if (nextUnderwater) showForecast(false);
		else hideForecast(false);
		resetScreenDrag(settleDuration, settleEasing);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "app-stage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			ref: phoneRef,
			className: "phone",
			"aria-label": "Application Marée",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: screenStackRef,
					className: isUnderwater ? "screen-stack is-underwater" : "screen-stack",
					style: atmosphereStyle,
					onPointerDown: handleScreenSwipeStart,
					onPointerMove: handleScreenSwipeMove,
					onPointerUp: (event) => finishScreenSwipe(event),
					onPointerCancel: (event) => finishScreenSwipe(event, true),
					onLostPointerCapture: (event) => {
						if (event.target === event.currentTarget) finishScreenSwipe(event, true);
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: `surface-screen phase-${dayCycle.phase} scene-ready${isDarkScene ? " is-dark" : ""}${isPlaying ? " is-playing" : ""}`,
						"data-tide-scene": tideScene,
						"data-tide-direction": tide.rising ? "rising" : "falling",
						"data-beach-life": beachLife,
						"data-bird-state": birdState,
						"data-shore-motion": shoreMotion?.kind ?? "idle",
						"aria-hidden": isUnderwater,
						inert: isUnderwater ? true : void 0,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sky-scene",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sky-night" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sky-dawn" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sky-dusk" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "star-field" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "celestial sun" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "celestial moon" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-cloud cloud-one" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-cloud cloud-two" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sky-flock",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sky-flock sky-flock-far",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-bird" })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sky-cloud cloud-three" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "horizon-haze" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "beach-scene",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "far-sea" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "coast-lights",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "lighthouse",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lighthouse-beam beam-left" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lighthouse-beam beam-right" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lighthouse-glare" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lighthouse-lamp" })
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "dune-houses",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-one" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-two" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-three" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-four" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-five" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-six" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-seven" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-eight" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-window window-nine" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-smoke" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "house-smoke" })
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "coast-bluff" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "coast-band",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "coast-haze" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "beach-sand beach-sand-base" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "beach-sand beach-sand-dry" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "beach-sand-texture" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "shoreline-track",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "beach-sand-wet" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "beachgoers",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "parasol parasol-one",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "parasol parasol-two",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "parasol parasol-three",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "beach-rivulets",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rivulet rivulet-one" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rivulet rivulet-two" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rivulet rivulet-three" })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "beach-shells",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shell shell-one" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shell shell-two" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shell shell-three" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "shell shell-four" })
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								ref: waterRef,
								className: "water",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-night" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-sunset" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-caustics" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-pattern" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-current water-current-one" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-current water-current-two" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-foam" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-slosh" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "water-spray spray-one" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "water-spray spray-two" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "water-spray spray-three" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "water-glint" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "tide-marks",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tide-mark tide-mark-high",
									style: { "--at": `${highMarkTop}%` },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tide-mark-label",
										children: "Pleine mer"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tide-mark-value",
										children: [formatHeight(tideRange.max), " m"]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tide-mark tide-mark-low",
									style: { "--at": `${lowMarkTop}%` },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tide-mark-label",
										children: "Basse mer"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tide-mark-value",
										children: [formatHeight(tideRange.min), " m"]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "interface",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
										className: "topbar",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											ref: locationButtonRef,
											className: "location",
											type: "button",
											onClick: (event) => openPortPicker(event.detail === 0),
											"aria-label": `Changer de port, port actuel : ${selectedPort.name}`,
											"aria-haspopup": "dialog",
											"aria-controls": "port-picker",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "location-name",
												children: selectedPort.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "chevron" })]
										}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "coefficient",
											"aria-label": currentCoefficient === null ? "Coefficient de la prochaine pleine mer indisponible" : `Coefficient ${hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"} de la prochaine pleine mer : ${currentCoefficient}`,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Coef." }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "coefficient-value",
													children: currentCoefficient ?? "—"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
													className: "coefficient-caption",
													children: hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
										className: "tide-reading",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "date",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: today })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "direction",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
														name: "arrow-up",
														className: tide.rising ? "arrow rising" : "arrow falling"
													}),
													"Marée ",
													tide.rising ? "montante" : "descendante"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "height-value",
												children: formatHeight(tide.height)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "height-unit",
												children: "m"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "next-tide",
												children: [
													tide.next.kind,
													" dans ",
													formatDuration(tide.minutesUntilNext)
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
										className: "controls",
										"aria-label": "Explorer la marée au fil de la journée",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "time-row",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Heure explorée" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatTime(minutes) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "time-actions",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														className: `live-button ${isFollowingLive ? "is-live" : ""}`,
														type: "button",
														onClick: returnToLive,
														"aria-label": isFollowingLive ? `Heure actuelle, en direct à ${formatTime(liveMinutes)}` : `Revenir en direct à ${formatTime(liveMinutes)}`,
														"aria-pressed": isFollowingLive,
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "live-dot",
															"aria-hidden": "true"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "En direct" })]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: `play ${isPlaying ? "is-playing" : ""}`,
														type: "button",
														onClick: () => {
															if (!isPlaying) setIsFollowingLive(false);
															setIsPlaying((playing) => !playing);
														},
														"aria-label": "Lecture automatique de la journée",
														"aria-pressed": isPlaying,
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: isPlaying ? "pause" : "play" }, isPlaying ? "pause" : "play")
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "slider-stack",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
														className: "sr-only",
														htmlFor: "time-slider",
														children: "Choisir l’heure de la journée"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														id: "time-slider",
														className: "time-slider",
														type: "range",
														min: "0",
														max: "1439",
														step: "1",
														value: minutes,
														"aria-valuetext": `${formatTime(minutes)}, ${dayCycle.label.toLowerCase()}, hauteur ${formatHeight(tide.height)} mètres, marée ${tide.rising ? "montante" : "descendante"}`,
														onPointerDown: () => {
															sliderStartMinutesRef.current = minutes;
														},
														onPointerUp: (event) => {
															const value = Number(event.currentTarget.value);
															const difference = Math.abs(value - sliderStartMinutesRef.current);
															if (Math.min(difference, 1440 - difference) >= 75) {
																agitateWater();
																signalShoreMotionAt(value);
															}
														},
														onChange: (event) => {
															setIsPlaying(false);
															setIsFollowingLive(false);
															setMinutes(Number(event.target.value));
														},
														style: { "--progress": `${minutes / 1439 * 100}%` }
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "range-labels",
														"aria-hidden": "true",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "00:00" }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Midi" }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "24:00" })
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
												id: "today-tides-title",
												className: "sr-only",
												children: hasLiveData ? "Horaires des marées aujourd’hui" : isComputed ? "Horaires des marées aujourd’hui, calculés à partir des constantes harmoniques" : "Horaires des marées aujourd’hui — horaires fictifs de démonstration"
											}),
											hasLiveData || isComputed || tideLoadState === "loading" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "fiction-notice",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														className: "fiction-notice-mark"
													}),
													"Horaires fictifs —",
													" ",
													tideLoadState === "unavailable" ? "source indisponible" : "aucune source configurée"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "tide-events",
												role: "group",
												"aria-labelledby": "today-tides-title",
												"data-fiction": hasLiveData || isComputed || tideLoadState === "loading" ? void 0 : "true",
												children: visibleTides.map((point) => {
													const isActive = minutes === point.minutes;
													return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														className: `event ${isActive ? "is-active" : ""}`,
														type: "button",
														onClick: () => jumpToTide(point),
														"aria-pressed": isActive,
														"aria-label": `${hasLiveData || isComputed ? "" : "Horaire fictif. "}Aller à ${point.kind.toLowerCase()} à ${formatTime(point.minutes)}, hauteur ${point.height.toFixed(1)} mètres${point.coefficient === null ? "" : `, coefficient ${point.coefficient}`}`,
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: point.kind === "Pleine mer" ? "event-icon high" : "event-icon low",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: point.kind === "Pleine mer" ? "arrow-up" : "arrow-down" })
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "event-copy",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: point.kind }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatTime(point.minutes) })]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "event-height",
																children: [
																	formatHeight(point.height),
																	" m",
																	point.coefficient === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [" · ", point.coefficient] })
																]
															})
														]
													}, point.minutes);
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "controls-footer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													ref: forecastButtonRef,
													className: "forecast-button",
													type: "button",
													"data-screen-swipe-handle": true,
													onClick: () => {
														if (suppressForecastClickRef.current) {
															suppressForecastClickRef.current = false;
															if (forecastClickResetTimerRef.current !== null) {
																window.clearTimeout(forecastClickResetTimerRef.current);
																forecastClickResetTimerRef.current = null;
															}
															return;
														}
														showForecast();
													},
													"aria-label": "Afficher les prévisions des 7 prochains jours",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "forecast-gesture",
														children: "Glisser · "
													}), "7 jours"] })
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "data-provenance",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `source-note ${!hasLiveData && !isComputed && tideLoadState !== "loading" ? "source-note--fiction" : ""}`,
														children: sourceLabel
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														className: "source-badge source-badge--official",
														type: "button",
														"data-no-screen-swipe": true,
														"aria-label": "Consulter les horaires officiels SHOM",
														"aria-haspopup": "dialog",
														"aria-controls": "shom-tide-dialog",
														onClick: (event) => openShomWidget(event.currentTarget),
														children: "SHOM"
													})]
												})]
											})
										]
									})
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "forecast-screen",
						"aria-labelledby": "forecast-section-title",
						"aria-hidden": !isUnderwater,
						inert: !isUnderwater ? true : void 0,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "underwater-light",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "water-drift",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "seabed",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "seabed-caustics" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "seabed-crab",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "crab-body" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "crab-claw crab-claw-left" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "crab-claw crab-claw-right" })
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bubble bubble-one",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bubble bubble-two",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bubble bubble-three",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
								className: "forecast-header",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										ref: backButtonRef,
										className: "back-button",
										type: "button",
										onClick: () => hideForecast(),
										"aria-label": "Revenir à la marée du jour",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "arrow-up" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Prévisions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										id: "forecast-section-title",
										children: selectedPort.name
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "forecast-depth",
										children: "7 jours"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "calendar",
								role: "group",
								"aria-label": "Choisir un jour",
								"data-no-screen-swipe": true,
								children: forecast.map((day, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: `day-button ${selectedDay === index ? "is-selected" : ""}`,
									type: "button",
									onClick: () => setSelectedDay(index),
									"aria-pressed": selectedDay === index,
									"aria-current": index === 0 ? "date" : void 0,
									"aria-label": `${new Intl.DateTimeFormat("fr-FR", {
										weekday: "long",
										day: "numeric",
										month: "long"
									}).format(day.date)}, coefficient ${hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"} ${coefficientsLabel(day.coefficients)}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: index === 0 ? "Auj." : new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day.date).replace(".", "") }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: day.date.getDate() }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: coefficientsLabel(day.coefficients) })
									]
								}, day.date.toISOString()))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "forecast-spacer",
								"aria-hidden": "true"
							}),
							hasLiveData || isComputed || tideLoadState === "loading" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "fiction-notice fiction-notice-forecast",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										className: "fiction-notice-mark"
									}),
									"Horaires fictifs sur les sept jours —",
									" ",
									tideLoadState === "unavailable" ? "source indisponible" : "aucune source configurée"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
								className: "forecast-card",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "forecast-card-content",
									"data-fiction": hasLiveData || isComputed || tideLoadState === "loading" ? void 0 : "true",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "forecast-card-heading",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(activeForecast.date) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: new Intl.DateTimeFormat("fr-FR", {
											day: "numeric",
											month: "long"
										}).format(activeForecast.date) })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "forecast-coef",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Coef. ", hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: coefficientsLabel(activeForecast.coefficients) })]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "forecast-tides",
										children: activeForecast.tides.map((point, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "forecast-tide",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: point.kind === "Pleine mer" ? "forecast-icon high" : "forecast-icon low",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: point.kind === "Pleine mer" ? "arrow-up" : "arrow-down" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: point.kind }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: formatTime(point.minutes) })] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													formatHeight(point.height),
													" m",
													point.coefficient === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [" · coef. ", point.coefficient] })
												] })
											]
										}, `${point.minutes}-${index}`))
									})]
								}, activeForecast.date.toISOString())
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "forecast-spacer",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "official-shom-panel",
								type: "button",
								"data-no-screen-swipe": true,
								"aria-haspopup": "dialog",
								"aria-controls": "shom-tide-dialog",
								onClick: (event) => openShomWidget(event.currentTarget),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "official-shom-mark",
										children: "SHOM"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "official-shom-copy",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Horaires officiels SHOM" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: ["Port de référence pour ", selectedPort.name] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "official-shom-chevron",
										"aria-hidden": "true",
										children: "›"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "sr-only",
								role: "status",
								"aria-live": "polite",
								"aria-atomic": "true",
								children: [
									"Prévisions pour ",
									new Intl.DateTimeFormat("fr-FR", {
										weekday: "long",
										day: "numeric",
										month: "long"
									}).format(activeForecast.date),
									", coefficient ",
									coefficientsLabel(activeForecast.coefficients)
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "underwater-note",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [hasLiveData ? "Données api-maree.fr · " : isComputed ? `Calculé pour ${harmonicStation} · ` : "Horaires fictifs · ", "Prévisions indicatives — non destinées à la navigation"] }), isComputed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "source-credit",
									children: HARMONIC_SOURCE.attribution
								}) : null]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
					ref: shomDialogRef,
					id: "shom-tide-dialog",
					className: "shom-dialog",
					"aria-labelledby": "shom-dialog-title",
					onClose: () => lastShomTriggerRef.current?.focus(),
					onClick: (event) => {
						if (event.target !== event.currentTarget) return;
						const bounds = event.currentTarget.getBoundingClientRect();
						if (!(event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom)) closeShomWidget();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "shom-sheet",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "shom-dialog-header",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Source officielle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								id: "shom-dialog-title",
								children: ["Marées à ", selectedPort.name]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "shom-close",
								type: "button",
								onClick: closeShomWidget,
								children: "Fermer"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "shom-dialog-body",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShomTideWidget, { portId: selectedPort.id }), hasLiveData ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "api-attribution",
								children: "Données de marée fournies par api-maree.fr sous licence CC BY, calculées à partir de composantes harmoniques Ifremer / PREVIMER, elles-mêmes sous licence CC BY. Données indicatives, impropres à la navigation."
							}) : null]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dialog", {
					ref: portDialogRef,
					id: "port-picker",
					className: "port-dialog",
					"aria-labelledby": "port-picker-title",
					tabIndex: -1,
					onClose: () => {
						setPortQuery("");
						locationButtonRef.current?.focus();
					},
					onClick: (event) => {
						if (event.target !== event.currentTarget) return;
						const bounds = event.currentTarget.getBoundingClientRect();
						if (!(event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom)) closePortPicker();
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "port-sheet",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "sheet-grabber",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
								className: "port-sheet-header",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Votre littoral" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									id: "port-picker-title",
									children: "Choisir un port"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "sheet-close",
									type: "button",
									onClick: closePortPicker,
									children: "Fermer"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "port-search",
								role: "search",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "sr-only",
										htmlFor: "port-search-input",
										children: "Rechercher un port ou une région"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										ref: portSearchRef,
										id: "port-search-input",
										type: "search",
										value: portQuery,
										onChange: (event) => setPortQuery(event.target.value),
										placeholder: "Rechercher un port",
										autoComplete: "off",
										enterKeyHint: "search",
										"aria-describedby": "port-result-count"
									}),
									portQuery ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "port-search-clear",
										type: "button",
										onClick: () => {
											setPortQuery("");
											portSearchRef.current?.focus();
										},
										children: "Effacer"
									}) : null
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "port-list-heading",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ports disponibles" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									id: "port-result-count",
									role: "status",
									"aria-live": "polite",
									children: [
										filteredPorts.length,
										" résultat",
										filteredPorts.length > 1 ? "s" : ""
									]
								})]
							}),
							filteredPorts.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "port-list",
								children: filteredPorts.map((port) => {
									const isSelected = port.id === selectedPort.id;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										className: `port-row ${isSelected ? "is-selected" : ""}`,
										type: "button",
										onClick: () => choosePort(port),
										"aria-pressed": isSelected,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "port-row-mark",
												"aria-hidden": "true",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "waves" })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "port-row-copy",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: port.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: port.area })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "port-row-meta",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "SHOM officiel" }), isSelected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "port-check",
													"aria-hidden": "true",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "check" })
												}) : null]
											})
										]
									}) }, port.id);
								})
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "port-empty",
								role: "status",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "port-empty-icon",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Aucun port trouvé" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										"Aucun résultat pour «\xA0",
										portQuery,
										"\xA0». Essayez un autre nom ou une région."
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setPortQuery("");
											portSearchRef.current?.focus();
										},
										children: "Effacer la recherche"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "port-demo-note",
								children: "Horaires officiels consultables pour chaque port · animation indicative selon disponibilité"
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "sr-only",
					"aria-live": "polite",
					children: portAnnouncement
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "sr-only",
					role: "status",
					"aria-live": "polite",
					"aria-atomic": "true",
					children: tideAnnouncement
				})
			]
		})
	});
}
//#endregion
export { Home as default };
