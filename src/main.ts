import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import "./styles.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const auth = useAuthStore();
auth.bootstrap();

app.use(router);

// Hardcoded measurement ID per request (no env lookup)
const GA_MEASUREMENT_ID = "G-W0J8CB6DBW";

function injectGtag(measurementId: string) {
	const head = document.head || document.getElementsByTagName("head")[0];
	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	head.appendChild(script);

	const inline = document.createElement("script");
	inline.text = `
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);} 
		gtag('js', new Date());
		gtag('config', '${measurementId}', { send_page_view: true });
	`;
	head.appendChild(inline);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
	injectGtag(GA_MEASUREMENT_ID);
	// Track route changes
	router.afterEach((to) => {
		const gtag = (window as any).gtag;
		if (typeof gtag === "function") {
			try {
				gtag("config", GA_MEASUREMENT_ID, { page_path: (to as any).fullPath || to.path });
			} catch (e) {
				// ignore
			}
		}
	});
} else {
	console.info("[GA] measurement id set but not in browser env");
}

app.mount("#app");
