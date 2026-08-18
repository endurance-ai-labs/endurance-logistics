// Scroll-scrubbed hero film background — 180-frame Blender render of the
// Foundations rig: foggy sunset -> digitizing night yard -> data grid.
// Replaces the realtime __yard3D WebGL scene (gated on .film-on).
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.getElementById('filmbg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var COUNT = 180;
  var PATH = 'assets/frames/hero/f_';
  document.body.classList.add('webgl-on', 'film-on');

  var imgs = new Array(COUNT);
  var loaded = 0, failed = false;
  var current = 0, smooth = 0, shown = -1;

  function src(i) {
    var n = String(i + 1);
    while (n.length < 4) n = '0' + n;
    return PATH + n + '.webp';
  }

  function draw(idx) {
    var img = imgs[idx];
    if (!img || !img.complete || !img.naturalWidth) return;
    var cw = canvas.width, chh = canvas.height;
    if (!cw || !chh) return;
    var s = Math.max(cw / img.naturalWidth, chh / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (chh - h) / 2, w, h);
    shown = idx;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    shown = -1;
    draw(Math.max(0, Math.min(COUNT - 1, Math.round(smooth))));
  }
  window.addEventListener('resize', resize);

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var t = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    current = t * (COUNT - 1);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function tick() {
    requestAnimationFrame(tick);
    smooth += (current - smooth) * 0.14;
    var idx = Math.max(0, Math.min(COUNT - 1, Math.round(smooth)));
    if (idx !== shown) draw(idx);
  }

  for (var i = 0; i < COUNT; i++) {
    (function (i) {
      var img = new Image();
      img.onload = function () {
        loaded++;
        if (i === 0) { resize(); onScroll(); draw(0); tick(); }
      };
      img.onerror = function () {
        if (!failed) {
          failed = true;
          // frames missing: fall back to the legacy scene path
          document.body.classList.remove('webgl-on', 'film-on');
        }
      };
      img.src = src(i);
      imgs[i] = img;
    })(i);
  }
})();
