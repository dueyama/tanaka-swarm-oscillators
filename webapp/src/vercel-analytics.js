window.va = window.va || function () {
  (window.vaq = window.vaq || []).push(arguments);
};

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const host = window.location.hostname;
const isLocalHost = localHosts.has(host) || host.endsWith(".local");

if (!isLocalHost) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
}
