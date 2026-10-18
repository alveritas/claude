/* NEVERHOLLOW theme behaviour: header, panels, bag drawer, product options, gallery, motion. */
(() => {
  window.NH_READY = true;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NH = window.NH || { routes: { cart: "/cart", cartAdd: "/cart/add", cartChange: "/cart/change", root: "/" } };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const onScroll = () => document.body.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Homepage: the big script is the logo on the first screen, so the header logo appears once it scrolls away.
  if (header && header.hasAttribute("data-home")) {
    const mark = $(".hero-mark");
    if (mark && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => header.classList.toggle("show-logo", !e.isIntersecting), {
        rootMargin: "-80px 0px 0px 0px",
      }).observe(mark);
    } else {
      header.classList.add("show-logo");
    }
    const logo = $("[data-header-logo]", header);
    if (logo) logo.addEventListener("focus", () => header.classList.add("show-logo"));
  }

  const msgs = $$(".ann-msg");
  if (msgs.length > 1 && !reduceMotion) {
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
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
  const openPanelEl = () => $$("[data-panel]").find((p) => !p.hidden);
  const setExpanded = (name, on) => $$(`[data-open="${name}"]`).forEach((b) => b.setAttribute("aria-expanded", String(on)));
  const openPanel = (name) => {
    const p = panel(name);
    if (!p) return false;
    if (!openPanelEl()) lastFocus = document.activeElement;
    $$("[data-panel]").forEach((x) => { if (x !== p && !x.hidden) { x.hidden = true; setExpanded(x.dataset.panel, false); } });
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
    $$("[data-panel]").forEach((x) => { x.hidden = true; setExpanded(x.dataset.panel, false); });
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
    if (e.key !== "Tab") return;
    if (lb) return trap(lb, e);
    const open = openPanelEl();
    if (open) trap(open, e);
  });

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
      fresh.hidden = !open && !wasOpen;
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
        if (availability) availability.textContent = CLOSED ? CLOSED_TEXT : AVAIL;
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
      if (availability) availability.textContent = CLOSED ? CLOSED_TEXT : v.available ? AVAIL : "Sold out";
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
        if (!addBtn || addBtn.disabled) return;
        if (missing().length) {
          if (err) { err.textContent = `Choose a ${missing()[0].toLowerCase()} first.`; err.hidden = false; }
          const g = groups.find((x) => selected[Number(x.dataset.option)] === null);
          if (g) { const first = $("[data-value]:not(.is-unavailable)", g) || $("[data-value]", g); if (first) first.focus(); }
          return;
        }
        addBtn.setAttribute("aria-busy", "true");
        addBtn.disabled = true;
        try {
          const body = new FormData(form);
          body.append("sections", "cart-drawer");
          const res = await fetch(`${NH.routes.cartAdd}.js`, { method: "POST", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body });
          const data = await res.json();
          if (!res.ok) throw new Error(data.description || data.message || "This size couldn’t be added. Try again.");
          if (data.sections && data.sections["cart-drawer"]) renderDrawer(data.sections["cart-drawer"], true);
          else await refreshDrawer(true);
          announce(`${product.title} added to bag`);
          if (addLabel) { addLabel.textContent = "Added to bag"; setTimeout(() => (addLabel.textContent = ADD), 1800); }
        } catch (ex) {
          if (err) { err.textContent = ex.message; err.hidden = false; }
        } finally {
          addBtn.removeAttribute("aria-busy");
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
        }
      });
    }
  }

  /* ── Full-screen photos ── */
  let lb = null;
  let lbReturn = null;
  function openLightbox(imgs, start, from) {
    if (!imgs.length) return;
    let i = Math.max(0, start);
    lbReturn = from || document.activeElement;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML = `<img alt=""><button type="button" class="icon-btn lightbox-close" aria-label="Close">✕</button>${imgs.length > 1 ? '<button type="button" class="icon-btn lightbox-prev" aria-label="Previous photo">‹</button><button type="button" class="icon-btn lightbox-next" aria-label="Next photo">›</button>' : ""}<p class="lightbox-count" aria-live="polite"></p>`;
    const img = $("img", lb);
    const show = () => {
      const src = imgs[i];
      const set = (src.getAttribute("srcset") || "").split(",").map((s) => s.trim().split(" ")[0]).filter(Boolean);
      img.src = set[set.length - 1] || src.currentSrc || src.src;
      img.alt = src.alt;
      img.classList.remove("is-zoomed");
      $(".lightbox-count", lb).textContent = imgs.length > 1 ? `${i + 1} / ${imgs.length}` : "";
    };
    lb.addEventListener("click", (e) => {
      if (e.target.closest(".lightbox-close")) return closeLightbox();
      if (e.target.closest(".lightbox-prev")) { i = (i - 1 + imgs.length) % imgs.length; return show(); }
      if (e.target.closest(".lightbox-next")) { i = (i + 1) % imgs.length; return show(); }
      if (e.target === img) img.classList.toggle("is-zoomed");
      else if (e.target === lb) closeLightbox();
    });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { i = (i + 1) % imgs.length; show(); }
      if (e.key === "ArrowLeft") { i = (i - 1 + imgs.length) % imgs.length; show(); }
    });
    document.body.appendChild(lb);
    document.body.classList.add("is-locked");
    show();
    $(".lightbox-close", lb).focus();
  }
  function closeLightbox() {
    if (!lb) return;
    lb.remove();
    lb = null;
    if (!openPanelEl()) document.body.classList.remove("is-locked");
    if (lbReturn && lbReturn.focus) lbReturn.focus();
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
  revealAll();
  window.NH = Object.assign(window.NH || {}, { reveal: revealAll });

  /* ── Cover photos: one per piece, changing every few seconds; the button stops them ── */
  $$("[data-hero-slides]").forEach((box) => {
    const slides = $$("[data-hero-slide]", box);
    const ticks = $$("[data-hero-tick]", box);
    const toggle = $("[data-hero-toggle]", box);
    if (slides.length < 2) { ticks.forEach((t) => (t.hidden = true)); if (toggle) toggle.hidden = true; return; }
    const MS = 6000;
    box.style.setProperty("--hero-ms", `${MS}ms`);
    let i = 0, timer = null, left = MS, started = 0, held = false, stopped = reduceMotion;
    const schedule = (ms) => {
      clearTimeout(timer);
      left = ms; started = performance.now();
      if (!held && !stopped) timer = setTimeout(() => show(i + 1), ms);
    };
    const setSlide = (n, on) => {
      const sl = slides[n];
      sl.classList.toggle("is-active", on);
      if (on) sl.removeAttribute("aria-hidden"); else sl.setAttribute("aria-hidden", "true");
      $$("a", sl).forEach((a) => (on ? a.removeAttribute("tabindex") : a.setAttribute("tabindex", "-1")));
      if (on) { const img = $(".hero-img", sl); if (img) { img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; } }
      ticks[n].removeAttribute("aria-current");
      if (on) { void ticks[n].offsetWidth; ticks[n].setAttribute("aria-current", "true"); }
    };
    const show = (n) => {
      setSlide(i, false);
      i = (n + slides.length) % slides.length;
      setSlide(i, true);
      schedule(MS);
    };
    const paint = () => box.classList.toggle("is-paused", held || stopped);
    // Hover, focus or a hidden tab hold the timer; it carries on from where it was.
    const hold = () => {
      if (held) return;
      held = true; clearTimeout(timer);
      left = Math.max(300, left - (performance.now() - started));
      paint();
    };
    const release = () => {
      if (!held) return;
      held = false; paint();
      if (!stopped) schedule(left);
    };
    ticks.forEach((t, n) => t.addEventListener("click", () => show(n)));
    if (toggle) toggle.addEventListener("click", () => {
      stopped = !stopped;
      box.classList.toggle("is-stopped", stopped);
      toggle.setAttribute("aria-label", stopped ? "Play the photos" : "Pause the photos");
      paint();
      if (!stopped) { held = false; paint(); schedule(left); } else clearTimeout(timer);
    });
    box.addEventListener("mouseenter", hold);
    box.addEventListener("mouseleave", release);
    box.addEventListener("focusin", hold);
    box.addEventListener("focusout", (e) => { if (!box.contains(e.relatedTarget)) release(); });
    document.addEventListener("visibilitychange", () => (document.hidden ? hold() : release()));
    if (stopped) box.classList.add("is-stopped");
    paint();
    schedule(MS);
  });

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
