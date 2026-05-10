/** Persisted when leaving HomeView so we can restore scroll when returning (see router scrollBehavior). */
export const HOME_SCROLL_STORAGE_KEY = "net-truyen-home-scroll-y";

export function saveHomeScrollPosition(): void {
  try {
    sessionStorage.setItem(HOME_SCROLL_STORAGE_KEY, String(Math.round(window.scrollY || 0)));
  } catch {
    // ignore quota / private mode
  }
}
