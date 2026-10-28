import html, os, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
from ad_copy import META, TIKTOK, GOOGLE, LIMITS, link

S = "/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad"
KIT = os.path.join(S, "ads", "kit"); os.makedirs(os.path.join(KIT, "ads"), exist_ok=True)
for f in os.listdir(os.path.join(S, "ads", "out")):
    shutil.copy(os.path.join(S, "ads", "out", f), os.path.join(KIT, "ads", f))
shutil.copy("/home/claude/shopify/theme/assets/nh-logo.svg", os.path.join(KIT, "nh-logo.svg"))
e = html.escape

def copyrow(text, limit=None, note=None):
    n = len(text)
    count = f'<span class="count">{n}/{limit}</span>' if limit else ""
    lab = f'<span class="note">{e(note)}</span>' if note else ""
    return (f'<li class="line"><div class="line-text">{lab}<span class="t">{e(text)}</span></div>'
            f'<div class="line-side">{count}<button type="button" class="copy" data-copy="{e(text)}">copy</button></div></li>')

def copylist(items, limit=None):
    rows = []
    for it in items:
        if isinstance(it, tuple): rows.append(copyrow(it[1], limit, "for the " + it[0]))
        else: rows.append(copyrow(it, limit))
    return '<ul class="lines">' + "".join(rows) + "</ul>"

ADS = [
  ("drop001", "drop 001", "vesper polo, lying. the cover of your homepage.", "link: drop 001 collection"),
  ("relic", "relic denim", "the script down the leg, the piece people stop on.", "link: relic denim page"),
  ("cathedral", "cathedral dress", "your women's lead. the photo runs off the right edge on purpose.", "link: cathedral dress page"),
  ("lineup", "the line-up", "four flat lays: vesper, relic, veil, cathedral.", "link: drop 001 collection"),
]
SIZES = [("4x5", "4:5 feed", "instagram & facebook feed"), ("9x16", "9:16 vertical", "stories, reels, tiktok"),
         ("1x1", "1:1 square", "feed, google"), ("1.91x1", "1.91:1 wide", "google, facebook right column")]

def ad_card(key, name, why, linknote):
    btns = "".join(f'<button type="button" class="dl" data-file="ads/neverhollow-{key}-{s}.jpg">{lab}</button>' for s, lab, _ in SIZES)
    return (f'<article class="ad"><figure class="ad-fig"><img src="ads/neverhollow-{key}-4x5.jpg" alt="{e(name)} ad, 4:5" loading="lazy" width="1080" height="1350"></figure>'
            f'<div class="ad-body"><h3>{e(name)}</h3><p class="muted">{e(why)}</p><p class="tiny">{e(linknote)}</p>'
            f'<div class="dl-row" aria-label="download {e(name)}">{btns}</div></div></article>')

links = [("drop 001 collection · meta", link("/collections/drop-001", "meta")),
         ("relic denim · meta", link("/products/relic-denim", "meta")),
         ("cathedral dress · meta", link("/products/cathedral-dress", "meta")),
         ("drop 001 collection · tiktok", link("/collections/drop-001", "tiktok")),
         ("drop 001 collection · google", link("/collections/drop-001", "google", "cpc"))]

days = 8  # oct 29 through nov 5
budget = [("instagram + facebook", 15, "sales campaign, one ad set"), ("tiktok", 20, "tiktok's minimum per ad group"), ("google search", 5, "searches for your name")]

page = f"""<title>neverhollow ads kit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&display=swap">
<style>
/* layout: one quiet column in the store's own voice — white studio, black type, lowercase; ads sit as tall tiles */
:root {{
  --paper: #ffffff; --ink: #0b0b0b; --mute: #5f5f5f; --line: #e5e5e5; --wash: #f5f5f4; --press: #000000; --on-press: #ffffff;
  --font: Archivo, "Helvetica Neue", Arial, sans-serif;
  --s1: 0.8125rem; --s2: 0.9375rem; --s3: 1.125rem; --s4: 1.5rem; --s5: clamp(2rem, 6vw, 3.25rem);
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --paper: #0b0b0b; --ink: #f3f3f2; --mute: #a3a3a1; --line: #262626; --wash: #161616; --press: #f3f3f2; --on-press: #0b0b0b; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --paper: #0b0b0b; --ink: #f3f3f2; --mute: #a3a3a1; --line: #262626; --wash: #161616; --press: #f3f3f2; --on-press: #0b0b0b; color-scheme: dark; }}
* {{ box-sizing: border-box; }}
[hidden] {{ display: none !important; }}
body {{ background: var(--paper); color: var(--ink); font-family: var(--font); font-size: var(--s2); line-height: 1.55; text-transform: lowercase; -webkit-font-smoothing: antialiased; }}
.wrap {{ max-width: 1040px; margin: 0 auto; padding-block: 40px 80px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 64px; }}
h1, h2, h3 {{ margin: 0; font-weight: 400; letter-spacing: -0.02em; text-wrap: balance; }}
h1 {{ font-size: var(--s5); line-height: 1.02; letter-spacing: -0.035em; }}
h2 {{ font-size: var(--s4); line-height: 1.15; }}
h3 {{ font-size: var(--s3); }}
p {{ margin: 0; max-width: 64ch; }}
.muted {{ color: var(--mute); }}
.tiny {{ font-size: var(--s1); color: var(--mute); }}
.label {{ font-size: var(--s1); font-weight: 500; letter-spacing: 0.03em; color: var(--mute); }}
.logo {{ width: 190px; height: auto; display: block; }}
:root[data-theme="dark"] .logo {{ filter: invert(1); }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) .logo {{ filter: invert(1); }} }}
header.top {{ display: grid; gap: 20px; }}
.lede {{ font-size: var(--s3); color: var(--mute); max-width: 56ch; }}
section {{ display: grid; gap: 20px; }}
.sec-head {{ display: grid; gap: 6px; }}
.rule {{ height: 1px; background: var(--line); }}
ol.steps {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 0; counter-reset: s; }}
ol.steps li {{ counter-increment: s; display: grid; grid-template-columns: 2.25rem minmax(0, 1fr); gap: 12px; padding-block: 16px; border-top: 1px solid var(--line); }}
ol.steps li::before {{ content: counter(s); font-size: var(--s3); font-variant-numeric: tabular-nums; }}
ol.steps b {{ font-weight: 500; }}
.budget {{ width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }}
.budget th, .budget td {{ text-align: left; padding: 12px 8px 12px 0; border-top: 1px solid var(--line); vertical-align: top; }}
.budget th {{ font-weight: 500; font-size: var(--s1); color: var(--mute); }}
.budget td.num, .budget th.num {{ text-align: right; padding-right: 0; white-space: nowrap; }}
.budget tfoot td {{ font-weight: 500; }}
.table-wrap {{ overflow-x: auto; }}
.ads {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 24px; }}
@media (max-width: 640px) {{ .ads {{ grid-template-columns: minmax(0, 1fr); }} }}
.ad {{ display: grid; gap: 14px; min-width: 0; }}
.ad-fig {{ margin: 0; border: 1px solid var(--line); background: #fff; }}
.ad-fig img, .ad-fig video {{ display: block; width: 100%; height: auto; max-width: 100%; }}
.ad-body {{ display: grid; gap: 6px; }}
.dl-row {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }}
button {{ font: inherit; text-transform: lowercase; cursor: pointer; }}
.dl, .copy {{ border: 1px solid var(--ink); background: transparent; color: var(--ink); padding: 8px 12px; font-size: var(--s1); line-height: 1; min-height: 36px; }}
.dl:hover, .copy:hover {{ background: var(--press); color: var(--on-press); }}
.dl:focus-visible, .copy:focus-visible, .tab:focus-visible {{ outline: 2px solid var(--ink); outline-offset: 2px; }}
.dl[disabled] {{ opacity: 0.45; cursor: default; }}
.dl.done, .copy.done {{ background: var(--press); color: var(--on-press); }}
.dl-note {{ font-size: var(--s1); color: var(--mute); }}
.video {{ display: grid; grid-template-columns: minmax(0, 280px) minmax(0, 1fr); gap: 24px; align-items: start; }}
@media (max-width: 640px) {{ .video {{ grid-template-columns: minmax(0, 1fr); }} .video .ad-fig {{ max-width: 280px; }} }}
.tabs {{ display: flex; flex-wrap: wrap; gap: 0; border-bottom: 1px solid var(--line); }}
.tab {{ background: none; border: 0; border-bottom: 2px solid transparent; color: var(--mute); padding: 10px 14px 9px 0; margin-right: 18px; font-size: var(--s2); }}
.tab[aria-selected="true"] {{ color: var(--ink); border-bottom-color: var(--ink); }}
.panel {{ display: grid; gap: 28px; padding-top: 8px; }}
.group {{ display: grid; gap: 8px; }}
ul.lines {{ list-style: none; margin: 0; padding: 0; }}
li.line {{ display: flex; gap: 12px; justify-content: space-between; align-items: center; padding-block: 12px; border-top: 1px solid var(--line); }}
.line-text {{ display: grid; gap: 2px; min-width: 0; }}
.line-text .t {{ overflow-wrap: anywhere; }}
.note {{ font-size: var(--s1); color: var(--mute); }}
.line-side {{ display: flex; gap: 10px; align-items: center; flex-shrink: 0; }}
.count {{ font-size: var(--s1); color: var(--mute); font-variant-numeric: tabular-nums; }}
ul.settings {{ margin: 0; padding-left: 1.1em; display: grid; gap: 6px; max-width: 70ch; }}
.url {{ font-size: var(--s1); }}
.callout {{ background: var(--wash); padding: 20px; display: grid; gap: 8px; }}
@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; animation: none !important; }} }}
</style>

<main class="wrap">
  <header class="top">
    <img class="logo" src="nh-logo.svg" alt="neverhollow">
    <h1>drop 001 ads</h1>
    <p class="lede">four ads and a 12-second video built from your store photos, the copy for each platform, and how to set the campaigns up. everything runs until pre-orders close on november 5.</p>
  </header>

  <section aria-labelledby="h-before">
    <div class="sec-head"><h2 id="h-before">before you launch</h2><p class="muted">these connect your store to each ad platform so the ads can see pre-orders and learn who buys. each one is a sign-in only you can do.</p></div>
    <ol class="steps">
      <li><div><b>shopify → apps → add "facebook &amp; instagram"</b> (by meta). connect your facebook page, instagram account and an ad account, and set data sharing to maximum. this adds the meta pixel.</div></li>
      <li><div><b>shopify → apps → add "tiktok"</b>. connect tiktok for business and turn the pixel on.</div></li>
      <li><div><b>shopify → apps → add "google &amp; youtube"</b> and connect a google ads account. for this week, use it only for search ads; shopping listings need merchant center approval, which can take longer than the days left.</div></li>
      <li><div><b>keep the end date.</b> pre-orders stop on november 5, so every campaign below ends november 5 at 11:59 pm eastern.</div></li>
    </ol>
  </section>

  <section aria-labelledby="h-budget">
    <div class="sec-head"><h2 id="h-budget">suggested budget</h2><p class="muted">october 29 to november 5, {days} days. change the numbers to suit you; nothing is spent until you launch.</p></div>
    <div class="table-wrap"><table class="budget">
      <thead><tr><th>platform</th><th>why</th><th class="num">per day</th><th class="num">{days} days</th></tr></thead>
      <tbody>{"".join(f'<tr><td>{p}</td><td class="muted">{w}</td><td class="num">${d}</td><td class="num">${d*days}</td></tr>' for p, d, w in budget)}</tbody>
      <tfoot><tr><td>total</td><td></td><td class="num">${sum(d for _, d, _ in budget)}</td><td class="num">${sum(d for _, d, _ in budget)*days}</td></tr></tfoot>
    </table></div>
    <p class="tiny">smaller start: instagram + facebook only, $15 a day, ${15*days} in total.</p>
  </section>

  <section aria-labelledby="h-ads">
    <div class="sec-head"><h2 id="h-ads">the ads</h2><p class="muted">each ad comes in four sizes. upload the 4:5 for feeds and the 9:16 for stories and reels in the same ad; meta places each one where it fits.</p><p class="dl-note" id="dl-note" hidden>saving files isn't available in this view. open this page in claude to download.</p></div>
    <div class="ads">{"".join(ad_card(*a) for a in ADS)}</div>
    <article class="ad video"><figure class="ad-fig"><video src="ads/neverhollow-drop001-video-9x16.mp4" controls muted playsinline preload="metadata" width="1080" height="1920" poster="ads/neverhollow-drop001-9x16.jpg"></video></figure>
      <div class="ad-body"><h3>the video, 12 seconds</h3><p class="muted">six pieces with a slow push-in, then the offer. made for tiktok and reels. it has no music: add a track from tiktok's or meta's commercial sound library when you build the ad.</p>
      <div class="dl-row"><button type="button" class="dl" data-file="ads/neverhollow-drop001-video-9x16.mp4">9:16 video</button></div></div></article>
  </section>

  <section aria-labelledby="h-copy">
    <div class="sec-head"><h2 id="h-copy">copy</h2><p class="muted">lowercase, and only what's true on the store. the numbers show characters used against each platform's limit.</p></div>
    <div class="tabs" role="tablist">
      <button type="button" class="tab" role="tab" id="t-meta" aria-controls="p-meta" aria-selected="true">instagram + facebook</button>
      <button type="button" class="tab" role="tab" id="t-tiktok" aria-controls="p-tiktok" aria-selected="false">tiktok</button>
      <button type="button" class="tab" role="tab" id="t-google" aria-controls="p-google" aria-selected="false">google</button>
    </div>
    <div class="panel" id="p-meta" role="tabpanel" aria-labelledby="t-meta">
      <div class="group"><span class="label">primary text</span>{copylist(META["primary"], LIMITS["meta.primary"])}</div>
      <div class="group"><span class="label">headline</span>{copylist(META["headline"], LIMITS["meta.headline"])}</div>
      <div class="group"><span class="label">description</span>{copylist(META["description"], LIMITS["meta.description"])}</div>
      <div class="group"><span class="label">settings</span><ul class="settings">
        <li>campaign: sales. conversion location: website. event: purchase.</li>
        <li>budget ${budget[0][1]} a day on the ad set, from launch to november 5, 11:59 pm.</li>
        <li>audience: advantage+ audience on. location: united states (shipping there is $8, free over $100). suggestions: ages 18–34, interests streetwear and street fashion.</li>
        <li>placements: advantage+. call to action: shop now.</li>
        <li>ads: one per concept (drop 001, relic denim, cathedral dress, the line-up) plus the video. after two days, switch off the ads with the fewest link clicks.</li>
      </ul></div>
    </div>
    <div class="panel" id="p-tiktok" role="tabpanel" aria-labelledby="t-tiktok" hidden>
      <div class="group"><span class="label">ad text</span>{copylist(TIKTOK["text"], LIMITS["tiktok.text"])}</div>
      <div class="group"><span class="label">settings</span><ul class="settings">
        <li>campaign: sales, website. optimise for complete payment with the tiktok pixel from the shopify app.</li>
        <li>ad group budget ${budget[1][1]} a day, tiktok's minimum, from launch to november 5.</li>
        <li>location: united states. ages 18–34. placement: tiktok.</li>
        <li>ad: the 12-second video, display name neverhollow, call to action shop now. add a sound from the commercial library.</li>
      </ul></div>
    </div>
    <div class="panel" id="p-google" role="tabpanel" aria-labelledby="t-google" hidden>
      <div class="group"><span class="label">headlines (responsive search ad)</span>{copylist(GOOGLE["headline"], LIMITS["google.headline"])}</div>
      <div class="group"><span class="label">descriptions</span>{copylist(GOOGLE["description"], LIMITS["google.description"])}</div>
      <div class="group"><span class="label">keywords</span>{copylist(GOOGLE["keywords"])}</div>
      <div class="group"><span class="label">settings</span><ul class="settings">
        <li>campaign: search. bidding: maximise clicks. budget ${budget[2][1]} a day, to november 5.</li>
        <li>location: united states. the keywords catch people who saw your other ads and search your name.</li>
        <li>a new brand gets few searches, so expect this to spend little. shopping listings are worth setting up after the drop.</li>
      </ul></div>
    </div>
  </section>

  <section aria-labelledby="h-links">
    <div class="sec-head"><h2 id="h-links">links</h2><p class="muted">use these as each ad's website url. the tags let shopify show which platform each sale came from.</p></div>
    <ul class="lines">{"".join(f'<li class="line"><div class="line-text"><span class="note">{e(n)}</span><span class="t url">{e(u)}</span></div><div class="line-side"><button type="button" class="copy" data-copy="{e(u)}">copy</button></div></li>' for n, u in links)}</ul>
  </section>

  <section class="callout" aria-labelledby="h-help">
    <h2 id="h-help">want me to build the campaigns?</h2>
    <p class="muted">your tiktok for business connector is half connected. finish connecting it in claude's connector settings and i can set up the tiktok campaign, paused, for you to check and launch. a meta ads connector would let me do the same for instagram and facebook.</p>
  </section>
</main>

<script>
(() => {{
  // copy buttons
  document.addEventListener('click', async (ev) => {{
    const b = ev.target.closest('.copy'); if (!b) return;
    const text = b.dataset.copy;
    try {{ await navigator.clipboard.writeText(text); b.textContent = 'copied'; b.classList.add('done'); setTimeout(() => {{ b.textContent = 'copy'; b.classList.remove('done'); }}, 1600); }}
    catch (e) {{ const t = b.closest('li').querySelector('.t'); const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'selected'; }}
  }});
  // tabs
  const tabs = [...document.querySelectorAll('.tab')];
  tabs.forEach(t => t.addEventListener('click', () => {{
    tabs.forEach(x => {{ const on = x === t; x.setAttribute('aria-selected', on); document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }});
    try {{ localStorage.setItem('nh-ads-tab', t.id); }} catch (e) {{}}
  }}));
  try {{ const saved = localStorage.getItem('nh-ads-tab'); const t = saved && document.getElementById(saved); if (t) t.click(); }} catch (e) {{}}
  // downloads through the viewer's save prompt
  let dl = null;
  const dlButtons = [...document.querySelectorAll('.dl')];
  const ready = window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null);
  ready.then(d => {{ dl = d; if (!d) {{ dlButtons.forEach(b => b.disabled = true); document.getElementById('dl-note').hidden = false; }} }}).catch(() => {{}});
  document.addEventListener('click', async (ev) => {{
    const b = ev.target.closest('.dl'); if (!b || !dl) return;
    const path = b.dataset.file, name = path.split('/').pop(), label = b.textContent;
    try {{
      b.textContent = 'preparing…';
      const blob = await (await fetch(path)).blob();
      await dl.save({{ filename: name, data: blob }});
      b.textContent = 'saved'; b.classList.add('done');
    }} catch (e) {{
      b.textContent = (e && e.code === 'declined') ? label : (e && e.code === 'rate_limited' ? 'try again' : 'couldn\\'t save');
    }}
    setTimeout(() => {{ b.textContent = label; b.classList.remove('done'); }}, 2400);
  }});
}})();
</script>
"""
open(os.path.join(KIT, "index.html"), "w").write(page)
print(os.path.join(KIT, "index.html"), len(page))
print(sorted(os.listdir(os.path.join(KIT, "ads"))))
