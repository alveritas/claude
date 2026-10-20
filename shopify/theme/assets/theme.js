/* NEVERHOLLOW theme behaviour: header, panels, bag drawer, product options, gallery, motion. */
(() => {
  window.NH_READY = true;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NH = window.NH || { routes: { cart: "/cart", cartAdd: "/cart/add", cartChange: "/cart/change", root: "/" } };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const root = document.documentElement;
  const announcer = $("[data-announcer]");
  const announce = (text) => {
    if (!announcer) return;
    announcer.textContent = "";
    setTimeout(() => (announcer.textContent = text), 60);
  };
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const visible = (el) => el.offsetParent !== null || el === document.activeElement;

  /* ── Header ── */
  const header = $("[data-header]");
  // Reading down, the header tucks away; any scroll up brings it back. It stays while anything in it is in use.
  let lastY = window.scrollY, travel = 0, queued = false;
  const body = document.body;
  const headerBusy = () => body.classList.contains("is-locked") || (header && (header.matches(":focus-within") || $(".has-mega.is-open", header)));
  const setClass = (name, on) => { if (body.classList.contains(name) !== on) body.classList.toggle(name, on); };
  const onScroll = () => {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const dy = y - lastY;
    lastY = y;
    setClass("is-scrolled", y > 24);
    travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
    if (y < 160 || headerBusy()) setClass("nav-up", false);
    else if (travel > 40) setClass("nav-up", true);
    else if (travel < -12) setClass("nav-up", false);
  };
  window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (header) header.addEventListener("focusin", () => setClass("nav-up", false));
  // With a mouse, heading for the top edge brings the header back too.
  if (finePointer) document.addEventListener("pointermove", (e) => { if (e.clientY < 64) setClass("nav-up", false); }, { passive: true });

  /* ── Intro: the script writes itself on white, then the white clears and the script glides into the header ── */
  const introDone = new Promise((resolve) => {
    if (!root.classList.contains("intro-on")) { const idle = $(".intro"); if (idle) idle.remove(); return resolve(); }
    const intro = $(".intro");
    const mark = intro && $(".intro-mark", intro);
    const fill = intro && $(".intro-bar span", intro);
    const end = () => {
      root.classList.remove("intro-on", "intro-morph");
      if (intro) intro.remove();
      window.dispatchEvent(new CustomEvent("nh:intro-end"));
      resolve();
    };
    if (!intro || !mark) return end();
    // Very slow start: the stylesheet has already lifted the black by itself, so just tidy up afterwards.
    if (performance.now() > 4200) { setTimeout(end, Math.max(0, 5500 - performance.now())); return; }
    const MAX = 3600;  // ms since the page was requested
    let finished = false, completing = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
    const loaded = (img) => (!img || img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); }));
    const wipe = $(".wipe", mark);
    const ink = wipe && wipe.getAnimations ? wipe.getAnimations()[0] : null;
    const steps = [document.fonts ? document.fonts.ready : Promise.resolve(), loaded($(".hero-img") || $(".gallery-img")), ink ? ink.finished.catch(() => {}) : Promise.resolve()];
    // The line creeps on its own (on the compositor, so it glides even while the page is busy loading),
    // then runs to the end once the fonts, the first photo and the logo are in.
    const lineAt = () => { if (!fill) return 0; const m = getComputedStyle(fill).transform; return m && m.startsWith("matrix") ? parseFloat(m.slice(7)) || 0 : 0; };
    const creep = fill && fill.animate ? fill.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(0.84)" }], { duration: 2800, easing: "cubic-bezier(0.25, 0.6, 0.3, 1)", fill: "forwards" }) : null;
    const complete = () => {
      if (finished || completing) return;
      completing = true;
      if (!fill || !fill.animate) return finish(false);
      const from = lineAt();
      if (creep) creep.cancel();
      fill.animate([{ transform: `scaleX(${from})` }, { transform: "scaleX(1)" }], { duration: 220 + 320 * (1 - from), easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" })
        .finished.then(() => wait(90)).then(() => finish(false), () => finish(false));
    };
    Promise.race([Promise.all(steps).then(() => wait(120)), wait(MAX - performance.now())]).then(complete);
    const skip = () => finish(true);
    const finish = (skipped) => {
      if (finished) return;
      finished = true;
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.removeEventListener(t, skip, true));
      // The script glides up into the header's logo (on every page); skipped before it finished
      // writing itself, it simply fades away with the white.
      const to = $("[data-header-logo] .brand-mark");
      const a = mark.getBoundingClientRect();
      const b = to && to.getBoundingClientRect();
      const drawn = !ink || ink.playState === "finished";
      const morph = drawn && b && b.width > 0 && b.bottom > 0 && b.top < window.innerHeight;
      if (morph) {
        root.classList.add("intro-morph");
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        mark.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${b.width / a.width})` }], { duration: 1050, easing: "cubic-bezier(0.55, 0, 0.15, 1)", fill: "forwards" });
      } else {
        mark.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-24px)" }], { duration: skipped ? 320 : 520, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" });
      }
      root.classList.add("intro-out");
      // On a slow connection the cover may still be loading as the black lifts: fade it in when it lands.
      const hero = $(".hero-img");
      if (hero && !hero.complete) {
        hero.style.opacity = "0";
        hero.addEventListener("load", () => { hero.style.transition = "opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1)"; hero.style.opacity = "1"; }, { once: true });
      }
      setTimeout(end, 1240);
    };
    // a tap, click, key or scroll skips it
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => window.addEventListener(t, skip, { capture: true, passive: true }));
  });

  // Announcement lines take turns; pointing at or focusing the bar holds the current line.
  const msgs = $$(".ann-msg");
  const annBar = $("[data-announcement]");
  if (msgs.length > 1 && !reduceMotion) {
    let i = 0, held = false;
    if (annBar) {
      annBar.addEventListener("mouseenter", () => (held = true));
      annBar.addEventListener("mouseleave", () => (held = false));
      annBar.addEventListener("focusin", () => (held = true));
      annBar.addEventListener("focusout", () => (held = false));
    }
    setInterval(() => {
      if (held || document.hidden) return;
      msgs[i].classList.remove("is-active");
      i = (i + 1) % msgs.length;
      msgs[i].classList.add("is-active");
    }, 4500);
  }

  // Shop menu: opens on hover or keyboard focus, closes when leaving or on Escape.
  $$("[data-mega]").forEach((item) => {
    let t;
    const open = () => { clearTimeout(t); item.classList.add("is-open"); };
    const close = (now) => { clearTimeout(t); if (now) item.classList.remove("is-open"); else t = setTimeout(() => item.classList.remove("is-open"), 160); };
    item.addEventListener("mouseenter", open);
    item.addEventListener("mouseleave", () => close());
    item.addEventListener("focusin", open);
    item.addEventListener("focusout", (e) => { if (!item.contains(e.relatedTarget)) close(); });
    item.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(true); const l = $(".nav-link", item); if (l) l.focus(); } });
    $$("a", item).forEach((a) => a.addEventListener("click", () => close(true)));
  });

  /* ── Panels: search, menu, bag ── */
  let lastFocus = null;
  const panel = (name) => $(`[data-panel="${name}"]`);
  const openPanelEl = () => $$("[data-panel]").find((p) => !p.hidden && !p.classList.contains("is-closing"));
  const setExpanded = (name, on) => $$(`[data-open="${name}"]`).forEach((b) => b.setAttribute("aria-expanded", String(on)));
  const openPanel = (name) => {
    const p = panel(name);
    if (!p) return false;
    if (!openPanelEl()) lastFocus = document.activeElement;
    $$("[data-panel]").forEach((x) => { if (x !== p && !x.hidden) { x.classList.remove("is-closing"); x.hidden = true; setExpanded(x.dataset.panel, false); } });
    p.classList.remove("is-closing");
    p.hidden = false;
    setExpanded(name, true);
    document.body.classList.add("is-locked");
    const f = name === "search" ? $("#search-input", p) : $(FOCUSABLE, $(".drawer, .search-panel", p) || p);
    if (f) setTimeout(() => f.focus(), 30);
    return true;
  };
  const closePanels = () => {
    const open = openPanelEl();
    if (!open) return;
    $$("[data-panel]").forEach((x) => {
      setExpanded(x.dataset.panel, false);
      if (x.hidden || x.classList.contains("is-closing")) return;
      if (reduceMotion) { x.hidden = true; return; }
      x.classList.add("is-closing");
      setTimeout(() => { if (x.classList.contains("is-closing")) { x.classList.remove("is-closing"); x.hidden = true; } }, 340);
    });
    document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  };
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) {
      if (opener.dataset.open === "cart" && document.body.classList.contains("template-cart")) return;
      if (openPanel(opener.dataset.open)) e.preventDefault();
      return;
    }
    if (e.target.closest("[data-close]")) closePanels();
  });
  // Keep keyboard focus inside whatever is open on top of the page.
  const trap = (box, e) => {
    const items = $$(FOCUSABLE, box).filter(visible);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (lb) closeLightbox(); else closePanels(); return; }
    if (lb && lbStep && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); lbStep(e.key === "ArrowRight" ? 1 : -1); return; }
    if (e.key !== "Tab") return;
    if (lb) return trap(lb, e);
    const open = openPanelEl();
    if (open) trap(open, e);
  });

  /* ── Search: before typing, the pieces; while typing, live matches ── */
  const searchForm = $("[data-search-form]");
  if (searchForm) {
    const input = $("#search-input", searchForm);
    const picks = $("[data-search-picks]");
    const results = $("[data-search-results]");
    const status = $("[data-search-status]");
    let timer = 0, ctrl = null, lastQ = "";
    const reset = () => {
      if (ctrl) ctrl.abort();
      lastQ = "";
      if (results) { results.hidden = true; results.innerHTML = ""; }
      if (picks) picks.hidden = false;
      if (status) status.textContent = "";
    };
    const run = async (q) => {
      if (ctrl) ctrl.abort();
      ctrl = "AbortController" in window ? new AbortController() : null;
      try {
        const url = `${NH.routes.suggest || "/search/suggest"}?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6&section_id=predictive-search`;
        const res = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
        if (!res.ok) throw new Error(String(res.status));
        const tmp = document.createElement("div");
        tmp.innerHTML = await res.text();
        const fresh = $("[data-results]", tmp);
        if (!fresh || !results || input.value.trim() !== q) return;
        results.innerHTML = fresh.innerHTML;
        results.hidden = false;
        if (picks) picks.hidden = true;
        const n = $$(".search-hit", results).length;
        if (status) status.textContent = n ? `${n} ${n === 1 ? "piece" : "pieces"} found` : "No matches";
      } catch (e) {
        // offline or no predictive search: the picks stay, and Enter still runs a full search
        if (e.name !== "AbortError" && results) { results.hidden = true; if (picks) picks.hidden = false; }
      }
    };
    input.addEventListener("input", () => {
      const q = input.value.trim();
      clearTimeout(timer);
      if (!q) return reset();
      if (q === lastQ) return;
      lastQ = q;
      timer = setTimeout(() => run(q), 180);
    });
  }

  /* ── Bag ── */
  const sectionUrl = () => `${NH.routes.root.replace(/\/$/, "")}/?sections=cart-drawer`;
  const renderDrawer = (html, open) => {
    if (!html) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const fresh = $("#cart-drawer", tmp);
    const current = $("#cart-drawer");
    if (fresh && current) {
      const wasOpen = !current.hidden;
      // the free-shipping bar grows from where it was, not from zero
      const before = $("[data-ship-fill]", current);
      const after = $("[data-ship-fill]", fresh);
      if (before && after) after.style.setProperty("--from-s", before.style.getPropertyValue("--s"));
      fresh.hidden = !open && !wasOpen;
      if (current.classList.contains("is-closing")) fresh.hidden = true;
      current.replaceWith(fresh);
    }
    const count = Number(($("[data-cart-count-source]") || {}).textContent || 0);
    $$("[data-cart-count]").forEach((b) => {
      b.textContent = String(count);
      b.hidden = count === 0;
      b.classList.remove("is-bump");
      void b.offsetWidth;
      b.classList.add("is-bump");
    });
    $$("[data-bag-link]").forEach((a) => a.setAttribute("aria-label", `Bag, ${count} ${count === 1 ? "item" : "items"}`));
    if (open) openPanel("cart");
  };
  const refreshDrawer = async (open) => {
    const res = await fetch(sectionUrl(), { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const data = await res.json();
    renderDrawer(data["cart-drawer"], open);
  };

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-line-qty]");
    if (!btn) return;
    const line = btn.closest("[data-line-key]");
    if (!line) return;
    line.classList.add("is-busy");
    try {
      const res = await fetch(`${NH.routes.cartChange}.js`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: line.dataset.lineKey, quantity: Number(btn.dataset.lineQty), sections: "cart-drawer" }),
      });
      if (document.body.classList.contains("template-cart")) return window.location.reload();
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || "error");
      renderDrawer(data.sections && data.sections["cart-drawer"], true);
      announce(Number(btn.dataset.lineQty) === 0 ? "Removed from bag" : "Bag updated");
    } catch {
      line.classList.remove("is-busy");
    }
  });

  /* ── Product page ── */
  function money(cents) {
    const fmt = NH.moneyFormat || "${{amount}}";
    const amount = (cents / 100).toFixed(2);
    const noZeros = amount.replace(/\.00$/, "");
    return fmt
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(cents / 100)))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, noZeros.replace(".", ","))
      .replace(/\{\{\s*amount\s*\}\}/, noZeros)
      .replace(/<[^>]*>/g, "");
  }

  const section = $("[data-product-section]");
  if (section) initProduct(section);

  function initProduct(root) {
    const product = JSON.parse($("[data-product-json]", root).textContent);
    const meta = JSON.parse($("[data-product-meta]", root).textContent);
    const form = $("#product-form");
    const input = $("[data-variant-input]", root);
    const groups = $$("[data-option]", root);
    const colorIdx = meta.colorIndex;
    // Pre-order pieces say "Pre-order"; after the last pre-order day the button stays off.
    const ADD = meta.addLabel || "Add to bag";
    const AVAIL = meta.availText || "Available";
    const CLOSED = Boolean(meta.closed);
    const CLOSED_TEXT = "Pre-orders closed";
    const variants = product.variants;
    const optionsOf = (v) => [v.option1, v.option2, v.option3].slice(0, product.options.length);
    const initial = variants.find((v) => String(v.id) === input.value) || variants[0];
    const selected = optionsOf(initial);
    // Unless a link chose a variant, the shopper picks their own size (no size is assumed).
    const chosenByLink = new URL(window.location.href).searchParams.has("variant");
    if (!chosenByLink && !meta.singleDefault) {
      product.options.forEach((_, i) => {
        if (i === colorIdx) return;
        const values = new Set(variants.map((v) => optionsOf(v)[i]));
        if (values.size > 1) selected[i] = null;
      });
    }
    const missing = () => product.options.map((name, i) => (selected[i] === null ? name : null)).filter(Boolean);

    // Which colour each photo belongs to: a photo starts a colour's set when a variant of that colour uses it.
    const groupOf = {};
    if (colorIdx !== null && colorIdx !== undefined) {
      const starts = {};
      variants.forEach((v) => { if (v.featured_media) starts[v.featured_media.id] = optionsOf(v)[colorIdx]; });
      let group = null;
      (product.media || []).forEach((m) => {
        if (starts[m.id] !== undefined) group = starts[m.id];
        groupOf[m.id] = group;
      });
    }

    const track = $("[data-gallery-track]", root);
    const slides = () => (track ? $$(".gallery-slide", track).filter((s) => !s.hidden) : []);
    const count = $("[data-gallery-count]", root);
    const activeIndex = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const updateCount = () => {
      const vis = slides();
      const i = Math.min(activeIndex(), vis.length - 1);
      if (count) count.textContent = `${i + 1} / ${vis.length}`;
    };
    // Larger screens show every photo: the first full width, the rest in pairs, a lone last one full width.
    const layout = () => {
      if (!track) return;
      const vis = slides();
      $$(".gallery-slide", track).forEach((s) => s.classList.remove("is-wide"));
      if (vis[0]) vis[0].classList.add("is-wide");
      if (vis.length > 1 && (vis.length - 1) % 2 === 1) vis[vis.length - 1].classList.add("is-wide");
      track.setAttribute("data-laid", "");
    };
    const goTo = (i, smooth = true) => {
      const vis = slides();
      if (!vis.length) return;
      const n = (i + vis.length) % vis.length;
      track.scrollTo({ left: n * track.clientWidth, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
    };
    if (track) {
      track.addEventListener("scroll", () => requestAnimationFrame(updateCount), { passive: true });
      const prev = $("[data-gallery-prev]", root);
      const next = $("[data-gallery-next]", root);
      if (prev) prev.addEventListener("click", () => goTo(activeIndex() - 1));
      if (next) next.addEventListener("click", () => goTo(activeIndex() + 1));
      track.addEventListener("keydown", (e) => {
        if (e.target !== track) return;
        if (e.key === "ArrowRight") { e.preventDefault(); goTo(activeIndex() + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goTo(activeIndex() - 1); }
      });
      track.addEventListener("click", (e) => {
        const z = e.target.closest("[data-zoom]");
        if (!z) return;
        const vis = slides();
        openLightbox(vis.map((s) => $("img", s)).filter(Boolean), vis.indexOf(z.closest(".gallery-slide")), z);
      });
      layout();
    }
    const filterGallery = (color) => {
      if (!track || colorIdx === null || colorIdx === undefined) return;
      const hasGroups = Object.values(groupOf).some((g) => g !== null);
      if (!hasGroups) return;
      $$(".gallery-slide", track).forEach((s) => { s.hidden = groupOf[s.dataset.mediaId] !== color; });
      if (!slides().length) $$(".gallery-slide", track).forEach((s) => (s.hidden = false));
      layout();
      goTo(0, false);
      updateCount();
    };

    const addBtn = $("[data-add]", root);
    const addLabel = $("[data-add-label]", root);
    const addPrice = $("[data-add-price]", root);
    const restock = $("[data-restock]", root);
    const dyn = $("[data-dynamic-checkout]", root);
    const availability = $("[data-availability]", root);
    const priceEl = $("[data-price]", root);
    const err = $("[data-form-error]", root);

    const findVariant = (opts) => variants.find((v) => optionsOf(v).every((o, i) => o === opts[i]));
    const update = (changed) => {
      let v = findVariant(selected);
      if (!v && changed === colorIdx && !missing().length) {
        // That size doesn't exist in the new colour: keep the colour, pick its first available size.
        v = variants.find((x) => optionsOf(x)[colorIdx] === selected[colorIdx] && x.available) ||
            variants.find((x) => optionsOf(x)[colorIdx] === selected[colorIdx]);
        if (v) optionsOf(v).forEach((o, i) => (selected[i] = o));
      }
      groups.forEach((g) => {
        const i = Number(g.dataset.option);
        const label = $(`[data-option-value="${i}"]`, g);
        if (label) label.textContent = selected[i] === null ? "Choose" : selected[i];
        $$("[data-value]", g).forEach((b) => {
          const on = b.dataset.value === selected[i];
          b.setAttribute("aria-checked", String(on));
          if (i !== colorIdx) {
            const opts = selected.slice();
            opts[i] = b.dataset.value;
            const fits = (x) => optionsOf(x).every((o, k) => opts[k] === null || o === opts[k]);
            const match = variants.find((x) => fits(x) && x.available) || variants.find(fits);
            const unavailable = !match || !match.available;
            b.classList.toggle("is-unavailable", unavailable);
            b.setAttribute("aria-label", `${b.dataset.value}${unavailable ? ", sold out" : ""}`);
          }
        });
        // One stop in each group for the Tab key: the chosen value, or the first one.
        const btns = $$("[data-value]", g);
        const current = btns.find((b) => b.getAttribute("aria-checked") === "true") || btns[0];
        btns.forEach((b) => (b.tabIndex = b === current ? 0 : -1));
      });
      if (missing().length) {
        // Nothing to buy until every choice is made; pressing the button says what's missing.
        if (addBtn) addBtn.disabled = CLOSED;
        if (addLabel) addLabel.textContent = CLOSED ? CLOSED_TEXT : ADD;
        if (addPrice) addPrice.hidden = CLOSED;
        if (dyn) dyn.hidden = true;
        if (restock) restock.hidden = true;
        if (availability) { availability.textContent = CLOSED ? CLOSED_TEXT : AVAIL; availability.hidden = !CLOSED; }
        const stickyMeta = $("[data-sticky-meta]", root);
        if (stickyMeta) stickyMeta.textContent = `${money((v || initial).price)}, choose a ${missing()[0].toLowerCase()}`;
        if (changed === colorIdx || changed === "init") filterGallery(selected[colorIdx]);
        return;
      }
      if (!v) {
        if (addBtn) addBtn.disabled = true;
        if (addLabel) addLabel.textContent = "Unavailable";
        if (addPrice) addPrice.hidden = true;
        return;
      }
      input.value = v.id;
      if (priceEl) priceEl.textContent = money(v.price);
      const buyable = v.available && !CLOSED;
      // The badge by the price only speaks up when something is wrong: sold out, or pre-orders closed.
      if (availability) { availability.textContent = CLOSED ? CLOSED_TEXT : v.available ? AVAIL : "Sold out"; availability.hidden = !CLOSED && v.available; }
      if (addBtn) addBtn.disabled = !buyable;
      if (addLabel) addLabel.textContent = CLOSED ? CLOSED_TEXT : v.available ? ADD : "Sold out";
      if (addPrice) { addPrice.textContent = money(v.price); addPrice.hidden = !buyable; }
      if (dyn) dyn.hidden = !buyable;
      if (restock) {
        restock.hidden = v.available || CLOSED;
        const opt = $("[data-restock-option]", restock);
        const lab = $("[data-restock-label]", restock);
        if (opt) opt.value = v.title;
        if (lab) lab.textContent = v.title;
      }
      const stickyMeta = $("[data-sticky-meta]", root);
      if (stickyMeta) stickyMeta.textContent = meta.singleDefault ? money(v.price) : `${money(v.price)}, ${v.title}`;
      if (changed !== "init" || chosenByLink) {
        const url = new URL(window.location.href);
        url.searchParams.set("variant", v.id);
        history.replaceState(history.state, "", url.toString());
      }
      if (changed === colorIdx || changed === "init") filterGallery(selected[colorIdx]);
    };
    // A short shake points at the choice that still needs making.
    const nudge = (el) => {
      if (!el || reduceMotion) return;
      el.classList.remove("is-nudged");
      void el.offsetWidth;
      el.classList.add("is-nudged");
      el.addEventListener("animationend", () => el.classList.remove("is-nudged"), { once: true });
    };
    const choose = (i, b) => {
      selected[i] = b.dataset.value;
      if (err) err.hidden = true;
      update(i);
    };
    groups.forEach((g) => {
      const i = Number(g.dataset.option);
      const btns = $$("[data-value]", g);
      btns.forEach((b, n) => {
        b.addEventListener("click", () => choose(i, b));
        // Arrow keys move along a radio group, as they do in native radio buttons.
        b.addEventListener("keydown", (e) => {
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          const to = btns[(n + step + btns.length) % btns.length];
          to.focus();
          choose(i, to);
        });
      });
    });
    update("init");

    // Size guide link opens the size panel below.
    $$("[data-open-size]", root).forEach((a) => a.addEventListener("click", (e) => {
      const d = $("#size-fit");
      if (!d) return;
      e.preventDefault();
      d.open = true;
      d.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      $("summary", d).focus({ preventScroll: true });
    }));

    // Quantity
    const qtyInput = $("[data-qty] input", root);
    const clampQty = (n) => Math.max(1, Math.min(10, n || 1));
    const minus = $("[data-qty-minus]", root);
    const plus = $("[data-qty-plus]", root);
    if (minus) minus.addEventListener("click", () => (qtyInput.value = clampQty(Number(qtyInput.value) - 1)));
    if (plus) plus.addEventListener("click", () => (qtyInput.value = clampQty(Number(qtyInput.value) + 1)));
    if (qtyInput) qtyInput.addEventListener("change", () => (qtyInput.value = clampQty(Number(qtyInput.value))));

    // Add to bag without leaving the page; the bag opens with the piece in it.
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!addBtn || addBtn.disabled || addBtn.getAttribute("aria-busy") === "true") return;
        if (missing().length) {
          if (err) { err.textContent = `Choose a ${missing()[0].toLowerCase()} first.`; err.hidden = false; }
          const g = groups.find((x) => selected[Number(x.dataset.option)] === null);
          if (g) {
            const first = $("[data-value]:not(.is-unavailable)", g) || $("[data-value]", g);
            if (first) first.focus();
            nudge($(".option-values", g));
          }
          return;
        }
        // While adding, the button keeps its look and says so (no flash of the disabled style).
        addBtn.setAttribute("aria-busy", "true");
        if (addLabel) addLabel.textContent = "Adding…";
        let added = false;
        try {
          const body = new FormData(form);
          body.append("sections", "cart-drawer");
          const res = await fetch(`${NH.routes.cartAdd}.js`, { method: "POST", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body });
          const data = await res.json();
          if (!res.ok) throw new Error(data.description || data.message || "This size couldn’t be added. Try again.");
          if (data.sections && data.sections["cart-drawer"]) renderDrawer(data.sections["cart-drawer"], true);
          else await refreshDrawer(true);
          announce(`${product.title} added to bag`);
          added = true;
          if (addLabel) { addLabel.textContent = "Added to bag"; setTimeout(() => (addLabel.textContent = ADD), 1800); }
        } catch (ex) {
          if (err) { err.textContent = ex.message; err.hidden = false; }
        } finally {
          addBtn.removeAttribute("aria-busy");
          if (!added && addLabel) addLabel.textContent = ADD;
          const v = findVariant(selected);
          addBtn.disabled = CLOSED || (Boolean(v) && !v.available);
        }
      });
    }

    // Phones: a buy bar while the real button is off screen.
    const sticky = $("[data-sticky-buy]", root);
    if (sticky && addBtn) {
      const stickyAdd = $("[data-sticky-add]", sticky);
      // Checked on scroll rather than by watching the button, so a fast fling past it still shows the bar.
      let shown = null, queued = false;
      const check = () => {
        queued = false;
        const show = addBtn.getBoundingClientRect().bottom < 0;
        if (show === shown) return;
        shown = show;
        sticky.classList.toggle("is-visible", show);
        sticky.setAttribute("aria-hidden", String(!show));
        if (stickyAdd) stickyAdd.tabIndex = show ? 0 : -1;
      };
      window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
      window.addEventListener("resize", check);
      check();
      if (stickyAdd) stickyAdd.addEventListener("click", () => {
        if (!addBtn.disabled && !missing().length) form.requestSubmit ? form.requestSubmit() : form.submit();
        else {
          form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
          if (missing().length && err) { err.textContent = `Choose a ${missing()[0].toLowerCase()} first.`; err.hidden = false; }
          const g = groups.find((x) => selected[Number(x.dataset.option)] === null);
          if (g) setTimeout(() => nudge($(".option-values", g)), 450);
        }
      });
    }
  }

  /* ── Full-screen photos: click or tap to zoom where you point, move to look around, swipe between photos ── */
  let lb = null;
  let lbReturn = null;
  let lbStep = null;
  const svgIcon = (d) => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  function openLightbox(imgs, start, from) {
    if (!imgs.length) return;
    let i = Math.max(0, start);
    let zoomed = false;
    lbReturn = from || document.activeElement;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    const many = imgs.length > 1;
    lb.innerHTML = `<div class="lightbox-stage"><img alt="" draggable="false"></div>` +
      `<button type="button" class="icon-btn lightbox-close" aria-label="Close">${svgIcon("M5.5 5.5l13 13M18.5 5.5l-13 13")}</button>` +
      (many ? `<button type="button" class="icon-btn lightbox-prev" aria-label="Previous photo">${svgIcon("M14.5 6l-6 6 6 6")}</button><button type="button" class="icon-btn lightbox-next" aria-label="Next photo">${svgIcon("M9.5 6l6 6-6 6")}</button>` : "") +
      `<p class="lightbox-count" aria-live="polite"></p><p class="lightbox-hint">${finePointer ? "Click to zoom" : "Tap to zoom"}</p>`;
    const img = $("img", lb);
    const largest = (el) => {
      const set = (el.getAttribute("srcset") || "").split(",").map((x) => x.trim().split(" ")[0]).filter(Boolean);
      return set[set.length - 1] || el.currentSrc || el.src;
    };
    // The zoom is a single transform (a shift plus a scale about the centre), so it glides on the GPU.
    // ox/oy say which point of the photo, in %, stays under the pointer.
    const S = 2.2;
    let ox = 50, oy = 50;
    const clamp = (v) => Math.min(100, Math.max(0, v));
    const stage = $(".lightbox-stage", lb);
    const render = () => {
      if (!zoomed) { img.style.transform = ""; return; }
      const w = img.offsetWidth, h = img.offsetHeight;
      const tx = -(S - 1) * (ox / 100 - 0.5) * w, ty = -(S - 1) * (oy / 100 - 0.5) * h;
      img.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${S})`;
    };
    const aim = (x, y) => {
      // measured against the photo's own box (transforms don't move layout)
      const st = stage.getBoundingClientRect();
      ox = clamp(((x - st.left - img.offsetLeft) / img.offsetWidth) * 100);
      oy = clamp(((y - st.top - img.offsetTop) / img.offsetHeight) * 100);
    };
    const zoom = (on, x, y) => {
      zoomed = on;
      if (on && x !== undefined) aim(x, y);
      img.classList.toggle("is-zoomed", on);
      lb.classList.toggle("is-zoomed", on);
      render();
    };
    const show = (n) => {
      i = (n + imgs.length) % imgs.length;
      ox = 50; oy = 50;
      zoom(false);
      img.classList.add("is-swapping");
      const next = largest(imgs[i]);
      const done = () => img.classList.remove("is-swapping");
      img.onload = done;
      img.src = next;
      img.alt = imgs[i].alt;
      if (img.complete) done();
      $(".lightbox-count", lb).textContent = many ? `${i + 1} / ${imgs.length}` : "";
      // fetch the neighbours so moving through is instant
      if (many) [imgs[(i + 1) % imgs.length], imgs[(i - 1 + imgs.length) % imgs.length]].forEach((x) => { const pre = new Image(); pre.src = largest(x); });
    };
    // Mouse: the zoomed photo follows the pointer. Touch: drag to look around, swipe to change photo.
    let down = null, moved = false;
    lb.addEventListener("pointerdown", (e) => {
      if (e.target !== img) return;
      down = { x: e.clientX, y: e.clientY, ox, oy };
      moved = false;
    });
    lb.addEventListener("pointermove", (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) moved = true;
      if (!zoomed) return;
      if (e.pointerType === "mouse") { aim(e.clientX, e.clientY); return render(); }
      if (!down) return;
      // touch: the photo follows the finger directly (no easing while dragging)
      img.classList.add("is-dragging");
      const k = 100 / (S - 1);
      ox = clamp(down.ox - ((e.clientX - down.x) / img.offsetWidth) * k);
      oy = clamp(down.oy - ((e.clientY - down.y) / img.offsetHeight) * k);
      render();
    });
    lb.addEventListener("pointerup", (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      const swipe = !zoomed && many && e.pointerType !== "mouse" && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4;
      img.classList.remove("is-dragging");
      if (swipe) show(i + (dx < 0 ? 1 : -1));
      else if (!moved) zoom(!zoomed, e.clientX, e.clientY);
      down = null;
    });
    lb.addEventListener("pointercancel", () => { down = null; img.classList.remove("is-dragging"); });
    lb.addEventListener("click", (e) => {
      if (e.target.closest(".lightbox-close")) return closeLightbox();
      if (e.target.closest(".lightbox-prev")) return show(i - 1);
      if (e.target.closest(".lightbox-next")) return show(i + 1);
      if (e.target === lb || e.target.classList.contains("lightbox-stage")) closeLightbox();
    });
    lbStep = many ? (d) => show(i + d) : null;
    document.body.appendChild(lb);
    document.body.classList.add("is-locked");
    show(i);
    $(".lightbox-close", lb).focus();
  }
  function closeLightbox() {
    if (!lb) return;
    const box = lb;
    lb = null;
    lbStep = null;
    box.classList.add("is-closing");
    setTimeout(() => box.remove(), reduceMotion ? 0 : 260);
    if (!openPanelEl()) document.body.classList.remove("is-locked");
    if (lbReturn && lbReturn.focus) lbReturn.focus({ preventScroll: true });
    lbReturn = null;
  }

  /* ── Spotlight views ── */
  $$("[data-spotlight]").forEach((s) => {
    const tabs = $$("[data-spot-tab]", s);
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      $$("[data-spot-slide]", s).forEach((sl) => sl.classList.toggle("is-active", sl.dataset.spotSlide === t.dataset.spotTab));
    }));
  });

  /* ── Motion: panels open like a roller shutter as they come into view; headings rise ── */
  // A fully clipped panel never registers as on screen, so we watch its container and open the panel
  // when the container scrolls into view.
  const watched = new Map();
  const revealer = !reduceMotion && "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (watched.get(e.target) || []).forEach((el) => el.classList.add("is-in"));
          watched.delete(e.target); revealer.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 })
    : null;
  const revealAll = (root = document) => {
    $$("[data-reveal]:not(.is-in), [data-rise]:not(.is-in)", root).forEach((el) => {
      if (!revealer) { el.classList.add("is-in"); return; }
      const box = el.hasAttribute("data-reveal") ? el.parentElement : el;
      if (!watched.has(box)) { watched.set(box, []); revealer.observe(box); }
      watched.get(box).push(el);
    });
  };
  introDone.then(() => revealAll());

  /* ── Cover on phones: the pair of photos turns by itself until you touch it ── */
  const heroSlides = $("[data-hero-slides]");
  if (heroSlides) {
    const slides = $$("[data-hero-slide]", heroSlides);
    const dots = $$("[data-hero-dots] span");
    const WAIT = 5200;
    const narrow = window.matchMedia("(max-width: 63.99rem)");
    let current = 0, timer = 0, auto = !reduceMotion && slides.length > 1, inView = true, settle = 0;
    heroSlides.style.setProperty("--hero-wait", `${WAIT}ms`);
    const index = () => Math.round(heroSlides.scrollLeft / Math.max(1, heroSlides.clientWidth));
    const paint = () => {
      dots.forEach((d, k) => {
        d.classList.remove("is-on", "is-timing");
        if (k !== current) return;
        if (timer) { void d.offsetWidth; d.classList.add("is-timing"); } else d.classList.add("is-on");
      });
    };
    const stop = () => { clearTimeout(timer); timer = 0; };
    const arm = () => {
      stop();
      if (auto && inView && narrow.matches && !document.hidden) timer = setTimeout(() => {
        timer = 0;
        heroSlides.scrollTo({ left: ((current + 1) % slides.length) * heroSlides.clientWidth, behavior: "smooth" });
      }, WAIT);
      paint();
    };
    heroSlides.addEventListener("scroll", () => {
      clearTimeout(settle);
      settle = setTimeout(() => { const n = index(); if (n !== current) { current = n; arm(); } }, 90);
    }, { passive: true });
    // once someone swipes or taps the photos, they're in charge: no more turning by itself
    ["pointerdown", "touchstart", "wheel"].forEach((t) => heroSlides.addEventListener(t, () => { if (auto) { auto = false; arm(); } }, { passive: true }));
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { inView = e.isIntersecting; arm(); }, { threshold: 0.35 }).observe(heroSlides);
    document.addEventListener("visibilitychange", arm);
    narrow.addEventListener ? narrow.addEventListener("change", arm) : narrow.addListener(arm);
    introDone.then(arm);
  }
  window.NH = Object.assign(window.NH || {}, { reveal: revealAll });

  // The footer script writes itself in once it scrolls into view.
  const inks = $$("[data-ink]");
  if (inks.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) inks.forEach((el) => el.classList.add("is-in"));
    else {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        $$("[data-ink]", e.target).forEach((el) => el.classList.add("is-in"));
        io.unobserve(e.target);
      }), { threshold: 0.35 });
      inks.forEach((el) => io.observe(el.parentElement));
    }
  }

  /* ── A label follows the mouse over photos you can open ── */
  if (finePointer) {
    const tag = document.createElement("div");
    tag.className = "cursor-tag";
    tag.setAttribute("aria-hidden", "true");
    document.body.appendChild(tag);
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, active = null;
    const step = () => {
      x += (tx - x) * (reduceMotion ? 1 : 0.28); y += (ty - y) * (reduceMotion ? 1 : 0.28);
      tag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(step) : 0;
    };
    const set = (el) => {
      if (el === active) return;
      active = el;
      if (el) { tag.textContent = el.dataset.cursor; x = tx; y = ty; tag.style.transform = `translate3d(${x}px, ${y}px, 0)`; }
      tag.classList.toggle("is-on", Boolean(el));
    };
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return set(null);
      tx = e.clientX; ty = e.clientY;
      set(e.target.closest ? e.target.closest("[data-cursor]") : null);
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    document.addEventListener("pointerleave", () => set(null));
    document.addEventListener("pointerdown", () => set(null));
    window.addEventListener("scroll", () => {
      if (!active) return;
      const el = document.elementFromPoint(tx, ty);
      set(el && el.closest ? el.closest("[data-cursor]") : null);
    }, { passive: true });
  }

  /* ── Page changes: the clicked card's photo travels into the product page ── */
  // Only the clicked card carries the shared name, so nothing else on the page flies around.
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".card-link");
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    $$("[style*='nh-product']").forEach((el) => (el.style.viewTransitionName = "none"));
    const frame = $(".card-frame", link);
    if (frame) frame.style.viewTransitionName = "nh-product";
    link.classList.add("is-leaving");
    const img = $(".card-img--main", link);
    try { if (img && img.currentSrc) sessionStorage.setItem("nh-trail", JSON.stringify({ path: new URL(link.href).pathname, src: img.currentSrc })); } catch { /* storage off: no trail */ }
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted) $$(".card-link.is-leaving").forEach((l) => l.classList.remove("is-leaving")); });

  /* ── Related products ── */
  $$("[data-recos]").forEach(async (el) => {
    if (el.children.length) return;
    try {
      const res = await fetch(el.dataset.url);
      if (!res.ok) return;
      const tmp = document.createElement("div");
      tmp.innerHTML = await res.text();
      const fresh = $("[data-recos]", tmp);
      if (fresh && fresh.children.length) { el.innerHTML = fresh.innerHTML; revealAll(el); }
    } catch { /* no suggestions: the section stays empty */ }
  });

  /* ── Sort menus submit themselves ── */
  $$("[data-autosubmit]").forEach((s) => s.addEventListener("change", () => s.form.submit()));
})();
