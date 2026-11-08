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
    // The main button goes straight to checkout (Buy now, or Pre-order now); Add to bag sits under it.
    // After the last pre-order day both stay off.
    const ADD = meta.addLabel || "Add to bag";
    const BUY = meta.buyLabel || "Buy now";
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

    const buyBtn = $("[data-buy-now]", root);
    const buyLabel = $("[data-buy-label]", root);
    const buyPrice = $("[data-buy-price]", root);
    const addBtn = $("[data-add]", root);
    const addLabel = $("[data-add-label]", root);
    const restock = $("[data-restock]", root);
    // Both buttons follow the same state; the main one carries the label and price, Add to bag hides
    // whenever there's nothing to add (sold out, pre-orders closed).
    const setButtons = (off, label, price, priceHidden, addHidden) => {
      if (buyBtn) buyBtn.disabled = off;
      if (buyLabel) buyLabel.textContent = label;
      if (buyPrice) { if (price !== null) buyPrice.textContent = price; buyPrice.hidden = priceHidden; }
      if (addBtn) { addBtn.disabled = off; addBtn.hidden = addHidden; }
      if (addLabel) addLabel.textContent = ADD;
    };
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
        setButtons(CLOSED, CLOSED ? CLOSED_TEXT : BUY, null, CLOSED, CLOSED);
        if (restock) restock.hidden = true;
        if (availability) { availability.textContent = CLOSED ? CLOSED_TEXT : AVAIL; availability.hidden = !CLOSED; }
        const stickyMeta = $("[data-sticky-meta]", root);
        if (stickyMeta) stickyMeta.textContent = `${money((v || initial).price)}, choose a ${missing()[0].toLowerCase()}`;
        if (changed === colorIdx || changed === "init") filterGallery(selected[colorIdx]);
        return;
      }
      if (!v) {
        setButtons(true, "Unavailable", null, true, true);
        return;
      }
      input.value = v.id;
      if (priceEl) priceEl.textContent = money(v.price);
      const buyable = v.available && !CLOSED;
      // The badge by the price only speaks up when something is wrong: sold out, or pre-orders closed.
      if (availability) { availability.textContent = CLOSED ? CLOSED_TEXT : v.available ? AVAIL : "Sold out"; availability.hidden = !CLOSED && v.available; }
      setButtons(!buyable, CLOSED ? CLOSED_TEXT : v.available ? BUY : "Sold out", money(v.price), !buyable, !buyable);
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
    // Enter in the quantity box only sets the number; it never sends anyone to checkout.
    if (qtyInput) qtyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); qtyInput.value = clampQty(Number(qtyInput.value)); } });

    // Buy now: the piece goes into the bag and the shopper goes straight to Shopify's checkout.
    // Add to bag: the piece goes into the bag without leaving the page, and the bag opens.
    // Which button sent the form: e.submitter, or the last one pressed on browsers without it.
    let pressed = null;
    [buyBtn, addBtn].forEach((b) => b && b.addEventListener("click", () => (pressed = b)));
    const CHECKOUT = "/checkout";
    // Coming back from checkout with the browser's back button shows the page as it was left: reset it.
    window.addEventListener("pageshow", (ev) => {
      if (!ev.persisted) return;
      [buyBtn, addBtn].forEach((b) => b && b.removeAttribute("aria-busy"));
      update("restore");
    });
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const sender = e.submitter || pressed;
        pressed = null;
        const buyNow = Boolean(buyBtn && sender === buyBtn);
        const btn = buyNow ? buyBtn : addBtn;
        const lab = buyNow ? buyLabel : addLabel;
        const idle = buyNow ? BUY : ADD;
        if (!btn || btn.disabled || btn.getAttribute("aria-busy") === "true") return;
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
        btn.setAttribute("aria-busy", "true");
        if (lab) lab.textContent = buyNow ? "Going to checkout…" : "Adding…";
        if (err) err.hidden = true;
        let added = false;
        try {
          const body = new FormData(form);
          if (!buyNow) body.append("sections", "cart-drawer");
          const res = await fetch(`${NH.routes.cartAdd}.js`, { method: "POST", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body });
          const data = await res.json();
          if (!res.ok) throw new Error(data.description || data.message || "This size couldn’t be added. Try again.");
          added = true;
          if (buyNow) { window.location.assign(CHECKOUT); return; }
          if (data.sections && data.sections["cart-drawer"]) renderDrawer(data.sections["cart-drawer"], true);
          else await refreshDrawer(true);
          announce(`${product.title} added to bag`);
          if (addLabel) { addLabel.textContent = "Added to bag"; setTimeout(() => (addLabel.textContent = ADD), 1800); }
        } catch (ex) {
          if (err) { err.textContent = ex.message; err.hidden = false; }
        } finally {
          // On the way to checkout the button keeps saying so until the page changes.
          if (!(buyNow && added)) {
            btn.removeAttribute("aria-busy");
            if (!added && lab) lab.textContent = idle;
            const v = findVariant(selected);
            const off = CLOSED || (Boolean(v) && !v.available);
            if (buyBtn) buyBtn.disabled = off;
            if (addBtn) addBtn.disabled = off;
          }
        }
      });
    }

    // Phones: a buy bar while the real button is off screen.
    const sticky = $("[data-sticky-buy]", root);
    const buyBox = $("[data-buy]", root);
    if (sticky && buyBtn && buyBox) {
      const stickyAdd = $("[data-sticky-add]", sticky);
      // Checked on scroll rather than by watching the button, so a fast fling past it still shows the bar.
      let shown = null, queued = false;
      const check = () => {
        queued = false;
        const show = buyBox.getBoundingClientRect().bottom < 0;
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
        if (!buyBtn.disabled && !missing().length) buyBtn.click();
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

  /* ── Sign-up offer: a small card in the corner, a quiet tab, and the code once someone joins ── */
  (() => {
    const KEY = "nh-offer";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
    const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(read(), v))); } catch { /* storage off */ } };
    const posted = new URLSearchParams(location.search).get("customer_posted") === "true";
    const offer = $("[data-offer]");
    const tab = $(".offer-tab");
    const isCustomer = Boolean(offer && offer.hasAttribute("data-customer"));
    const code = offer ? offer.dataset.code : (($("[data-apply-code]") || {}).dataset || {}).applyCode;

    // Shopify's discount link saves the code for checkout; only once that worked do the notes say so.
    const applyCode = async (c) => {
      if (!c) return;
      try { if (sessionStorage.getItem("nh-code") === c) { root.classList.add("nh-code-applied"); return; } } catch { /* storage off */ }
      try {
        const res = await fetch(`${(NH.routes.root || "/").replace(/\/$/, "")}/discount/${encodeURIComponent(c)}`, { credentials: "same-origin" });
        if (!res.ok) return;
        root.classList.add("nh-code-applied");
        try { sessionStorage.setItem("nh-code", c); } catch { /* storage off */ }
      } catch { /* offline: the notes keep saying to enter it at checkout */ }
    };

    // Copy buttons next to the code.
    document.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-copy-code]");
      if (!b) return;
      try {
        await navigator.clipboard.writeText(b.dataset.copyCode);
        b.textContent = "Copied";
        announce("Code copied");
        setTimeout(() => (b.textContent = "Copy"), 1800);
      } catch {
        const v = b.parentElement && $(".code-value", b.parentElement);
        if (v) { const r = document.createRange(); r.selectNodeContents(v); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      }
    });

    // Signed-in customers with no orders yet: their code goes to checkout too.
    const own = $("[data-apply-code]");
    if (own) applyCode(own.dataset.applyCode);

    // Anyone who joined (on any of the sign-up forms) keeps the code and loses the prompts.
    const joinedNow = posted && $("[data-code-reveal]");
    if (joinedNow) write({ joined: true });
    if (read().joined && !isCustomer) { root.classList.add("nh-offer-joined"); applyCode(code); }

    if (!offer) return;
    const showTab = () => { if (tab && !isCustomer && !read().joined) tab.hidden = false; };
    let hideTimer = 0;
    const show = (focus) => {
      clearTimeout(hideTimer);
      offer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => offer.classList.add("is-open")));
      if (tab) tab.hidden = true;
      // Opened on purpose: keyboard and screen-reader users land in the card (the card itself, so no
      // field grabs the phone keyboard); opened on its own, it never takes focus.
      if (focus) setTimeout(() => $(".offer-card", offer).focus({ preventScroll: true }), 60);
    };
    const hide = () => {
      offer.classList.remove("is-open");
      hideTimer = setTimeout(() => (offer.hidden = true), reduceMotion ? 0 : 360);
      write({ closedAt: Date.now() });
      showTab();
    };
    $("[data-offer-close]", offer).addEventListener("click", hide);
    // the centred pop-up closes from its backdrop too
    offer.addEventListener("click", (e) => { if (e.target === offer && offer.classList.contains("offer--modal")) hide(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !offer.hidden && !openPanelEl()) hide(); });
    document.addEventListener("click", (e) => {
      const o = e.target.closest("[data-offer-open]");
      if (!o) return;
      e.preventDefault();
      if (openPanelEl()) closePanels();
      show(true);
    });

    // Just joined from the card (or from a form that isn't on this page): open on the code.
    // Joined from the form on the page itself: that form shows the code where they are.
    const hashTarget = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
    const fromCard = !hashTarget || hashTarget.id === "offer-form";
    if (joinedNow && fromCard) { show(true); return; }
    if ($("[data-offer-error]", offer) && location.hash === "#offer-form") { show(true); return; }
    if (isCustomer || read().joined || posted) return;

    // On its own: once, after a while or some scrolling, never over an open panel; then not again for a while.
    const state = read();
    const snoozeMs = (Number(offer.dataset.snooze) || 14) * 864e5;
    if (!offer.hasAttribute("data-auto") || (state.closedAt && Date.now() - state.closedAt < snoozeMs) || (window.Shopify && window.Shopify.designMode)) {
      showTab();
      return;
    }
    const delay = Math.max(0, Number(offer.dataset.delay) || 0) * 1000;
    const t0 = Date.now();
    let fired = false;
    const fire = () => {
      if (fired) return;
      if (openPanelEl() || document.body.classList.contains("is-locked")) { setTimeout(fire, 3000); return; }
      fired = true;
      window.removeEventListener("scroll", onScroll);
      show(offer.classList.contains("offer--modal"));
    };
    const onScroll = () => {
      if (Date.now() - t0 < 5000) return;
      const seen = (window.scrollY + window.innerHeight) / Math.max(1, document.documentElement.scrollHeight);
      if (seen > 0.55) fire();
    };
    setTimeout(fire, delay);
    window.addEventListener("scroll", onScroll, { passive: true });
  })();
})();

/* ── Friday the 13th countdown. It only counts down to the release time (from the shop metafield, printed
   into data-release as seconds). At zero it asks the store whether the release collection has anything
   published and shows that: "shop the drop" once pieces are live, otherwise a publishing note that keeps
   checking. It never unlocks anything; the pieces become buyable only when Shopify publishes them. ── */
(function () {
  const drops = document.querySelectorAll("[data-drop]");
  if (!drops.length) return;
  const pad = (n) => String(n).padStart(2, "0");
  // A digit that changes rolls in (unless the visitor asked for less motion).
  const roll = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const set = (el, v) => {
    if (!el || el.dataset.v === v) return;
    el.dataset.v = v;
    if (roll) { const sp = document.createElement("span"); sp.className = "cd-roll"; sp.textContent = v; el.replaceChildren(sp); }
    else el.textContent = v;
  };
  drops.forEach((root) => {
    const at = Number(root.dataset.release) * 1000;
    const box = root.querySelector("[data-countdown]");
    const status = root.querySelector("[data-drop-status]");
    const btn = root.querySelector("[data-drop-btn]");
    const url = root.dataset.dropUrl;
    const cells = {};
    if (box) box.querySelectorAll("[data-cd]").forEach((el) => (cells[el.dataset.cd] = el));
    let tries = 0, timer = null;

    const goLive = () => {
      root.dataset.state = "live";
      if (box) box.hidden = true;
      if (status) status.hidden = true;
      if (btn) { btn.textContent = btn.dataset.liveLabel || btn.textContent; btn.classList.remove("btn-line"); btn.classList.add("btn-solid"); }
      if (root.classList.contains("drop--page") && !document.querySelector("[data-product-grid], .product-grid-list")) {
        // on the release page itself, reload once so the published pieces replace the previews
        try { if (!sessionStorage.getItem("nh-drop-reloaded")) { sessionStorage.setItem("nh-drop-reloaded", "1"); location.reload(); } } catch (e) {}
      }
    };
    const check = () => {
      if (!url) return;
      fetch(url.replace(/\/$/, "") + "/products.json?limit=1", { headers: { Accept: "application/json" }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .then((d) => {
          if (d && d.products && d.products.length) return goLive();
          root.dataset.state = "publishing";
          if (box) box.hidden = true;
          if (status) status.hidden = false;
          // keep checking for 15 minutes, every 20 seconds
          if (++tries < 45) setTimeout(check, 20000);
        })
        .catch(() => { if (++tries < 45) setTimeout(check, 20000); });
    };
    const tick = () => {
      const left = at - Date.now();
      if (left <= 0) { clearInterval(timer); check(); return; }
      const s = Math.floor(left / 1000);
      set(cells.d, pad(Math.floor(s / 86400)));
      set(cells.h, pad(Math.floor((s % 86400) / 3600)));
      set(cells.m, pad(Math.floor((s % 3600) / 60)));
      set(cells.s, pad(s % 60));
    };
    if (root.dataset.state === "live") return;
    if (!at) { if (box) box.hidden = true; return; }
    if (root.dataset.state === "publishing" || Date.now() >= at) { check(); return; }
    if (box) box.hidden = false;
    tick();
    timer = setInterval(tick, 1000);
  });
})();

/* ── Product photos: a quiet "worn" switch between the laid-flat photos and the photos on a person. ── */
(function () {
  document.querySelectorAll("[data-worn-toggle]").forEach((btn) => {
    const gallery = btn.closest("[data-gallery]");
    const track = gallery && gallery.querySelector("[data-gallery-track]");
    if (!track) return;
    btn.addEventListener("click", () => {
      const worn = btn.getAttribute("aria-pressed") !== "true";
      track.querySelectorAll(".gallery-slide").forEach((s) => { s.hidden = s.hasAttribute("data-worn") ? !worn : worn; });
      btn.setAttribute("aria-pressed", String(worn));
      btn.textContent = worn ? btn.dataset.on : btn.dataset.off;
      gallery.classList.toggle("is-worn-view", worn);
      track.scrollTo({ left: 0 });
      const count = gallery.querySelector("[data-gallery-count]");
      if (count) count.textContent = "1 / " + track.querySelectorAll(".gallery-slide:not([hidden])").length;
    });
  });
})();

/* ── Atmosphere (Theme settings → Atmosphere): the torch-lit cover, headings that decode, the ticker that
   follows the scroll, the statement that lights up word by word, and a "View" label on product photos.
   None of it runs for visitors who ask for less motion, and none of it touches buying. ── */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const html = document.documentElement;
  if (reduce) return;

  /* Torch-lit cover: the light follows the cursor or a finger, and drifts on its own when left alone. */
  document.querySelectorAll("[data-lantern]").forEach((box) => {
    if (!box.querySelector(".drop-img--lit")) return;
    const area = box.closest(".drop") || box;
    let w = 0, h = 0, R = 0, x = 0, y = 0, tx = 0, ty = 0, r = 0, last = -1e9, visible = true, raf = 0;
    const t0 = performance.now();
    const size = () => { const b = box.getBoundingClientRect(); w = b.width; h = b.height; R = Math.max(w, h) * 0.4; };
    size(); x = tx = w * 0.5; y = ty = h * 0.38;
    box.classList.add("is-lantern");
    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      const idle = now - last > 2600;
      if (idle) {
        const t = (now - t0) / 1000;
        tx = w * (0.5 + 0.22 * Math.sin(t * 0.31)); ty = h * (0.42 + 0.2 * Math.sin(t * 0.43 + 1.1));
      }
      const k = idle ? 0.025 : 0.16;
      x += (tx - x) * k; y += (ty - y) * k; r += (R - r) * 0.03;
      box.style.setProperty("--lx", x.toFixed(1) + "px");
      box.style.setProperty("--ly", y.toFixed(1) + "px");
      box.style.setProperty("--lr", r.toFixed(1) + "px");
      raf = requestAnimationFrame(frame);
    };
    const aim = (cx, cy) => { const b = box.getBoundingClientRect(); tx = cx - b.left; ty = cy - b.top; last = performance.now(); };
    area.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") aim(e.clientX, e.clientY); }, { passive: true });
    const touch = (e) => { const t = e.touches && e.touches[0]; if (t) aim(t.clientX, t.clientY); };
    area.addEventListener("touchstart", touch, { passive: true });
    area.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("resize", size, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(box);
    }
    raf = requestAnimationFrame(frame);
  });

  /* Headings decode letter by letter the first time they come into view; nav links do it on hover. */
  const UP = "ABCDEFGHKNOPRSTUVXYZ0123456789";
  const LO = "abcdeghknopqrsuvxyz";
  const scramble = (el, dur) => {
    if (el.dataset.scrambling || el.children.length) return;
    const txt = el.dataset.text || (el.dataset.text = el.textContent);
    if (!txt.trim()) return;
    const set = getComputedStyle(el).textTransform === "uppercase" ? UP : LO;
    const n = txt.length, tail = 5, start = performance.now();
    el.dataset.scrambling = "1";
    el.setAttribute("aria-label", txt.trim());
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const settled = Math.floor(p * (n + tail)) - tail;
      let out = "";
      for (let i = 0; i < n; i++) {
        const c = txt[i];
        out += (p >= 1 || i < settled || /\s/.test(c)) ? c : set[(Math.random() * set.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else { el.textContent = txt; delete el.dataset.scrambling; el.removeAttribute("aria-label"); }
    };
    requestAnimationFrame(step);
  };
  if (html.classList.contains("nh-gfx")) {
    const heads = document.querySelectorAll(".section-title, .drop-title, .rich-heading, :is(.template-collection, .template-list-collections) .page-title");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        scramble(e.target, 650 + Math.min(700, e.target.textContent.length * 28));
      }), { threshold: 0.6 });
      heads.forEach((el) => io.observe(el));
    }
    if (fine) document.querySelectorAll(".nav-link").forEach((a) => a.addEventListener("mouseenter", () => scramble(a, 380)));
  }

  /* The large ticker moves with the scroll: faster as you scroll, and the other way when you scroll up. */
  if (html.classList.contains("nh-scrollfx")) {
    document.querySelectorAll(".marquee--graphic").forEach((mq) => {
      const track = mq.querySelector("[data-marquee-track]");
      if (!track) return;
      mq.classList.add("is-driven");
      let x = 0, round = track.scrollWidth / 6, dir = 1, boost = 0, lastY = window.scrollY, visible = false, raf = 0;
      const frame = () => {
        raf = 0;
        if (!visible) return;
        x -= (0.55 + boost) * dir; boost *= 0.93;
        if (round > 0) { if (x <= -round) x += round; if (x > 0) x -= round; }
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        raf = requestAnimationFrame(frame);
      };
      window.addEventListener("scroll", () => {
        const d = window.scrollY - lastY; lastY = window.scrollY;
        if (d) { dir = d > 0 ? 1 : -1; boost = Math.min(16, boost + Math.abs(d) * 0.1); }
      }, { passive: true });
      window.addEventListener("resize", () => { round = track.scrollWidth / 6; }, { passive: true });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(mq);
      } else { visible = true; raf = requestAnimationFrame(frame); }
    });

    /* The brand statement lights up word by word as it scrolls up the screen. Lines with links stay as they are. */
    document.querySelectorAll(".rich--statement .prose").forEach((prose) => {
      const words = [];
      prose.querySelectorAll("p").forEach((para) => {
        if (para.querySelector("a, strong, em")) return;
        const parts = para.textContent.split(/(\s+)/);
        para.textContent = "";
        parts.forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) { para.appendChild(document.createTextNode(t)); return; }
          const sp = document.createElement("span"); sp.className = "w"; sp.textContent = t;
          para.appendChild(sp); words.push(sp);
        });
      });
      if (!words.length) return;
      prose.classList.add("is-wordlit");
      let raf = 0;
      const update = () => {
        raf = 0;
        const b = prose.getBoundingClientRect(), vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - b.top) / (b.height + vh * 0.35)));
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
      };
      window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      window.addEventListener("resize", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      update();
    });
  }

  /* A small "View" label follows the cursor over product photos. */
  if (fine) {
    document.addEventListener("pointerover", (e) => {
      const a = e.target.closest && e.target.closest(".card-link");
      if (a && !a.dataset.cursor) a.dataset.cursor = "View";
    }, { passive: true });
  }
})();

/* ── Atmosphere, second layer: the line that tracks the page, the cover heading that thins where the cursor
   passes, category photos and product photos that follow the cursor, and buttons that lean toward it.
   Cursor effects run only with a mouse or trackpad; nothing here runs for visitors who ask for less motion,
   except the progress line, which only mirrors their own scrolling. ── */
(function () {
  const html = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hover = fine && html.classList.contains("nh-hoverfx");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Progress line: only on pages long enough to need it. */
  const line = document.querySelector("[data-scroll-line]");
  if (line) {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = html.scrollHeight - window.innerHeight;
      const on = max > window.innerHeight * 0.6;
      line.classList.toggle("is-on", on);
      line.style.transform = "scaleX(" + (on ? clamp(window.scrollY / max, 0, 1).toFixed(4) : 0) + ")";
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask, { passive: true });
    window.addEventListener("load", ask);
    update();
  }

  if (reduce) return;

  /* Cover heading: split into letters (whole words never break), lines fixed where they fall, then a
     thinning wave runs through it once; afterwards the letters near the cursor thin out and recover. */
  if (html.classList.contains("nh-gfx")) {
    document.querySelectorAll(".drop-title").forEach((h) => {
      const txt = h.textContent.trim();
      if (!txt || h.children.length) return;
      const base = parseFloat(getComputedStyle(h).fontWeight) || 800;
      const low = Math.max(400, base - 420);
      if (base - low < 100) return;
      h.textContent = "";
      const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = txt;
      const vis = document.createElement("span"); vis.className = "dt"; vis.setAttribute("aria-hidden", "true");
      const L = [];
      txt.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { vis.appendChild(document.createTextNode(" ")); return; }
        const w = document.createElement("span"); w.className = "dt-w";
        for (const ch of part) {
          const s = document.createElement("span"); s.className = "dt-l"; s.textContent = ch;
          w.appendChild(s); L.push({ el: s, cur: base, tgt: base, x: 0, y: 0 });
        }
        vis.appendChild(w);
      });
      h.append(sr, vis);

      const paint = (o, v) => { const r = Math.round(v); if (r !== o.shown) { o.shown = r; o.el.style.fontWeight = r; } };
      let fs = 0;
      const layout = () => {
        L.forEach((o) => { o.cur = o.tgt = base; paint(o, base); });
        vis.querySelectorAll("br").forEach((b) => b.remove());
        h.classList.remove("is-set");
        let top = null;
        vis.querySelectorAll(".dt-w").forEach((w) => {
          const t = w.offsetTop;
          if (top !== null && t > top + 2) w.before(document.createElement("br"));
          top = t;
        });
        h.classList.add("is-set");
        const hb = h.getBoundingClientRect();
        fs = parseFloat(getComputedStyle(h).fontSize) || 80;
        L.forEach((o) => { const b = o.el.getBoundingClientRect(); o.x = b.left - hb.left + b.width / 2; o.y = b.top - hb.top + b.height / 2; });
      };
      layout();
      let rw = 0;
      window.addEventListener("resize", () => { clearTimeout(rw); rw = setTimeout(layout, 150); }, { passive: true });
      // lines are set where they fall in the real font, so measure again once it has loaded
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!waving) layout(); else setTimeout(layout, 2400); });

      let raf = 0, waving = true, px = -1e4, py = -1e4, near = false;
      const settle = () => {
        raf = 0;
        let moving = false;
        L.forEach((o) => {
          o.cur += (o.tgt - o.cur) * 0.2;
          if (Math.abs(o.tgt - o.cur) > 0.6) moving = true; else o.cur = o.tgt;
          paint(o, o.cur);
        });
        if (moving || near) raf = requestAnimationFrame(settle);
      };
      const aim = () => {
        const hb = h.getBoundingClientRect(), R = fs * 1.7;
        L.forEach((o) => {
          const d = Math.hypot(px - hb.left - o.x, py - hb.top - o.y);
          const f = d < R ? Math.pow(1 - d / R, 1.6) : 0;
          o.tgt = base - (base - low) * f;
        });
        if (!raf) raf = requestAnimationFrame(settle);
      };
      if (hover) {
        const zone = h.closest(".drop-inner") || h;
        zone.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; near = true; if (!waving) aim(); }, { passive: true });
        zone.addEventListener("pointerleave", () => { near = false; px = py = -1e4; if (!waving) aim(); });
      }
      const wave = () => {
        const t0 = performance.now(), span = 720, gap = 42, total = span + gap * L.length;
        const step = (now) => {
          const t = now - t0;
          L.forEach((o, i) => {
            const ph = (t - i * gap) / span;
            const f = ph > 0 && ph < 1 ? Math.sin(Math.PI * ph) : 0;
            o.cur = o.tgt = base - (base - low) * 0.9 * f;
            paint(o, o.cur);
          });
          if (t < total) requestAnimationFrame(step);
          else { waving = false; L.forEach((o) => { o.cur = o.tgt = base; paint(o, base); }); if (near) aim(); }
        };
        requestAnimationFrame(step);
      };
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(wave, 250); } }, { threshold: 0.5 });
        io.observe(h);
      } else waving = false;
    });
  }

  if (!hover) return;

  /* Shop by category (index): the hovered row's photo follows the cursor, a little behind it and tilting with
     its speed; it opens like a shutter and closes when the cursor leaves the list. */
  document.querySelectorAll("[data-cat-index]").forEach((sec) => {
    const fl = sec.querySelector("[data-cat-float]"), list = sec.querySelector(".cat-index");
    if (!fl || !list) return;
    sec.classList.add("has-float");
    const imgs = Array.from(fl.querySelectorAll("[data-cat-img]"));
    imgs.forEach((s) => { const i = s.querySelector("img"); if (i) i.loading = "eager"; });
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false, fw = 0, fh = 0;
    const measure = () => { const b = fl.getBoundingClientRect(); fw = b.width; fh = b.height; };
    const frame = () => {
      raf = 0;
      const dx = tx - x;
      x += dx * 0.14; y += (ty - y) * 0.14;
      const rot = clamp(dx * 0.05, -7, 7);
      fl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      if (on || Math.abs(dx) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(frame);
    };
    const target = (cx, cy) => {
      if (!fw) measure();
      tx = clamp(cx + 28, 8, window.innerWidth - fw - 8);
      ty = clamp(cy - fh / 2, 8, window.innerHeight - fh - 8);
    };
    sec.querySelectorAll("[data-cat-row]").forEach((row) => {
      row.addEventListener("pointerenter", (e) => {
        const i = row.dataset.catRow;
        imgs.forEach((s) => s.classList.toggle("is-on", s.dataset.catImg === i));
        target(e.clientX, e.clientY);
        if (!on) { x = tx; y = ty; }
        on = true; fl.classList.add("is-on");
        if (!raf) raf = requestAnimationFrame(frame);
      });
    });
    list.addEventListener("pointermove", (e) => { target(e.clientX, e.clientY); if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    list.addEventListener("pointerleave", () => { on = false; fl.classList.remove("is-on"); });
    window.addEventListener("resize", measure, { passive: true });
  });

  /* Product photos drift slightly against the cursor inside their frame. */
  document.addEventListener("pointermove", (e) => {
    const a = e.target.closest && e.target.closest(".card-link");
    if (!a) return;
    const f = a.querySelector(".card-frame");
    if (!f) return;
    const b = f.getBoundingClientRect();
    const rx = clamp((e.clientX - b.left) / b.width - 0.5, -0.5, 0.5), ry = clamp((e.clientY - b.top) / b.height - 0.5, -0.5, 0.5);
    f.style.setProperty("--px", (-rx * 14).toFixed(1) + "px");
    f.style.setProperty("--py", (-ry * 14).toFixed(1) + "px");
  }, { passive: true });

  /* Main buttons lean toward the cursor (never the buying buttons on a product page). */
  document.querySelectorAll(".drop-btn:not(.drop-btn--2), .cta .btn, .newsletter .btn-solid, .section-head .btn").forEach((btn) => {
    btn.classList.add("is-magnet");
    btn.addEventListener("pointermove", (e) => {
      const b = btn.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      btn.style.transform = `translate(${clamp(dx * 0.2, -9, 9).toFixed(1)}px, ${clamp(dy * 0.3, -6, 6).toFixed(1)}px)`;
    }, { passive: true });
    btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
  });
})();
