export const ROUTES = ['about', 'resume', 'skills', 'projects', 'contact'] as const;
export type Route = (typeof ROUTES)[number];

export function go(route: Route): void {
  window.location.hash = `/${route}`;
}

function currentRoute(): Route | null {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : null;
}

function render(): void {
  const route = currentRoute();

  document.querySelectorAll<HTMLElement>('[data-route]').forEach((section) => {
    section.hidden = section.dataset.route !== route;
  });

  document.querySelectorAll<HTMLAnchorElement>('.site-nav a').forEach((link) => {
    const linkRoute = link.getAttribute('href')?.replace(/^#\//, '');
    if (linkRoute === route) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (route) {
    const section = document.querySelector<HTMLElement>(`[data-route="${route}"]`);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
}

export function initRouter(): void {
  window.addEventListener('hashchange', render);
  render();
}
