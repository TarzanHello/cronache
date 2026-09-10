(() => {
  "use strict";

  const BOOKMARK_KEY = "cronache-bookmark";

  const el = {
    loading: document.getElementById("loading"),
    story: document.getElementById("story"),
    meta: document.getElementById("story-meta"),
    title: document.getElementById("story-title"),
    ambientazione: document.getElementById("story-ambientazione"),
    body: document.getElementById("story-body"),
    nota: document.getElementById("story-nota"),
    notaBody: document.getElementById("story-nota-body"),
    progressCurrent: document.getElementById("progress-current"),
    progressTotal: document.getElementById("progress-total"),
    restart: document.getElementById("restart"),
    share: document.getElementById("share"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    zonePrev: document.getElementById("zone-prev"),
    zoneNext: document.getElementById("zone-next"),
    reader: document.getElementById("reader"),
    toast: document.getElementById("toast"),
  };

  let stories = [];
  let index = 0;
  let toastTimer = null;

  function getBookmark() {
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setBookmark(numero) {
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify({ numero, quando: Date.now() }));
    } catch {
      // localStorage non disponibile: la lettura funziona comunque, solo senza segnalibro
    }
  }

  function indexForNumero(numero) {
    const i = stories.findIndex((s) => s.numero === numero);
    return i === -1 ? null : i;
  }

  function hashNumero() {
    const m = /^#storia-(-?\d+)$/.exec(location.hash);
    return m ? Number(m[1]) : null;
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    el.toast.setAttribute("aria-hidden", "false");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
      el.toast.setAttribute("aria-hidden", "true");
    }, 1800);
  }

  function render(direction) {
    const s = stories[index];
    if (!s) return;

    const swap = () => {
      el.meta.textContent = s.categoria || "";
      el.meta.hidden = !s.categoria;
      el.title.textContent = s.titolo;
      el.ambientazione.textContent = s.ambientazione;
      el.ambientazione.hidden = !s.ambientazione;
      el.body.innerHTML = s.html;

      el.nota.open = false;
      if (s.notaHtml) {
        el.notaBody.innerHTML = s.notaHtml;
        el.nota.hidden = false;
      } else {
        el.nota.hidden = true;
      }

      el.progressCurrent.textContent = String(index + 1);
      el.progressTotal.textContent = String(stories.length);
      el.reader.scrollTop = 0;
      el.story.classList.remove("leaving-left", "leaving-right");
    };

    if (direction) {
      el.story.classList.add(direction === "next" ? "leaving-left" : "leaving-right");
      setTimeout(swap, direction ? 140 : 0);
    } else {
      swap();
    }

    el.prev.disabled = index === 0;
    el.next.disabled = index === stories.length - 1;

    history.replaceState(null, "", `#storia-${s.numero}`);
    setBookmark(s.numero);
  }

  function goTo(newIndex, direction) {
    if (newIndex < 0 || newIndex >= stories.length || newIndex === index) return;
    index = newIndex;
    render(direction);
  }

  function goPrev() { goTo(index - 1, "prev"); }
  function goNext() { goTo(index + 1, "next"); }

  function initNavigation() {
    el.prev.addEventListener("click", goPrev);
    el.next.addEventListener("click", goNext);
    el.zonePrev.addEventListener("click", goPrev);
    el.zoneNext.addEventListener("click", goNext);

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    });

    let startX = 0, startY = 0, tracking = false;
    const THRESHOLD = 55;

    el.reader.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    }, { passive: true });

    el.reader.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext(); else goPrev();
      }
    }, { passive: true });

    el.restart.addEventListener("click", () => {
      goTo(0, "prev");
      showToast("Sei tornato alla prima storia");
    });
  }

  function initShare() {
    el.share.addEventListener("click", async () => {
      const s = stories[index];
      const url = `${location.origin}${location.pathname}#storia-${s.numero}`;
      const shareData = { title: `Cronache — ${s.titolo}`, text: s.titolo, url };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch {
          /* utente ha annullato la condivisione */
        }
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copiato");
      } catch {
        showToast(url);
      }
    });
  }

  async function init() {
    initNavigation();
    initShare();

    let data;
    try {
      const res = await fetch("stories.json", { cache: "no-store" });
      data = await res.json();
    } catch {
      el.loading.textContent = "Non riesco a caricare le storie. Riprova più tardi.";
      return;
    }

    stories = (data.storie || []).slice().sort((a, b) => a.numero - b.numero);

    if (!stories.length) {
      el.loading.textContent = "Non ci sono ancora storie da leggere.";
      return;
    }

    const fromHash = hashNumero();
    const bookmark = getBookmark();

    let startIndex = 0;
    if (fromHash !== null && indexForNumero(fromHash) !== null) {
      startIndex = indexForNumero(fromHash);
    } else if (bookmark && indexForNumero(bookmark.numero) !== null) {
      startIndex = indexForNumero(bookmark.numero);
    }

    index = startIndex;
    el.loading.hidden = true;
    el.story.hidden = false;
    render();
  }

  init();
})();
