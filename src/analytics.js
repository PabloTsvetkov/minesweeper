const counterId = 100038289;

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') {
    return;
  }

  window.ym(counterId, 'reachGoal', eventName, params);
}

export function trackPageView(path) {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') {
    return;
  }

  window.ym(counterId, 'hit', path);
}
