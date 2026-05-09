// Pre-hydration theme initializer.
// Loaded synchronously in <head> so <html data-theme> is set before the
// page paints, preventing the dark-to-light flash on reload. Defaults to
// dark if no preference is saved, or if localStorage is unavailable.
(function () {
  try {
    var t = localStorage.getItem('q-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
