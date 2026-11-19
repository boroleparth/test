// Receives a full HTML document from the app and replaces this page with it.
// Only the parent window (the tutor app) is allowed to send code.
(function () {
  if (window.parent === window) {
    document.body.textContent = 'This page is only used inside the CS Tutor playground.';
    return;
  }
  window.addEventListener('message', function onMessage(event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== 'run' || typeof data.doc !== 'string') return;
    window.removeEventListener('message', onMessage);
    document.open();
    document.write(data.doc);
    document.close();
  });
  window.parent.postMessage({ type: 'runner-ready' }, '*');
})();
