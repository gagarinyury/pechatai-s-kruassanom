const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
const plausibleScriptSrc = import.meta.env.VITE_PLAUSIBLE_SCRIPT_SRC?.trim() || 'https://plausible.io/js/script.js';

declare global {
  interface Window {
    plausible?: ((eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void) & {
      q?: Array<[string, ({ props?: Record<string, string | number | boolean> } | undefined)?]>;
    };
  }
}

let scriptInjected = false;

function isAnalyticsEnabled() {
  return Boolean(plausibleDomain);
}

export function initAnalytics() {
  if (!isAnalyticsEnabled() || scriptInjected || typeof document === 'undefined') return;

  if (!window.plausible) {
    const queuedPlausible = ((...args: Parameters<NonNullable<typeof window.plausible>>) => {
      queuedPlausible.q = queuedPlausible.q || [];
      queuedPlausible.q.push(args);
    }) as NonNullable<typeof window.plausible>;

    window.plausible = queuedPlausible;
  }

  const existingScript = document.querySelector(`script[data-domain="${plausibleDomain}"]`);
  if (existingScript) {
    scriptInjected = true;
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = plausibleDomain;
  script.src = plausibleScriptSrc;
  document.head.appendChild(script);
  scriptInjected = true;
}

export function trackPageview(path: string) {
  if (!isAnalyticsEnabled()) return;
  window.plausible?.('pageview', { props: { path } });
}

export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  if (!isAnalyticsEnabled()) return;
  window.plausible?.(eventName, props ? { props } : undefined);
}
