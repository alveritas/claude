"""NEVERHOLLOW ad creatives: real store photos, the uploaded logo unchanged, lowercase, honest copy.
Renders HTML with Playwright to JPG at each platform size, then a 9:16 slideshow video with ffmpeg."""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

S = "/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad"
OUT = os.path.join(S, "ads", "out")
os.makedirs(OUT, exist_ok=True)
PH = json.load(open(os.path.join(S, "photo-map.json")))
FONT = "file:///home/claude/shopify/theme/assets/archivo-nh.woff2"
LOGO = "file:///home/claude/shopify/theme/assets/nh-logo.svg"
from PIL import Image
SRC = os.path.join(S, "ads", "src"); os.makedirs(SRC, exist_ok=True)
def img(k):
    """The store photo, trimmed 2.5% off each side so no backdrop edge shows in the ad."""
    out = os.path.join(SRC, k + ".jpg")
    if not os.path.exists(out):
        im = Image.open(PH[k]).convert("RGB"); w, h = im.size; d = int(w * 0.025)
        im.crop((d, 0, w - d, h)).save(out, quality=95)
    return "file://" + out

OFFER = "join the list for 25% off your first order"
URL = "neverhollow.online"
DATES = "pre-orders close november 5 · ships by january 15"

CONCEPTS = {
  "drop001":  dict(title="drop 001", sub=DATES, photos=["vesper-lying"]),
  "relic":    dict(title="relic denim", sub="the neverhollow script down the left leg · waist 28–46", photos=["relic-sitting"]),
  "cathedral":dict(title="cathedral dress", sub="a gothic cross on the hip, the script running through it", photos=["cathedral-seated"], bleed=True),
  "lineup":   dict(title="drop 001 · twelve pieces", sub=DATES, photos=["vesper-flat", "relic-flat", "veil-flat", "cathedral-flat"]),
}
SIZES = {"4x5": (1080, 1350), "9x16": (1080, 1920), "1x1": (1080, 1080), "1.91x1": (1200, 628)}

BASE_CSS = f"""
@font-face {{ font-family: Archivo; src: url({FONT}) format('woff2'); font-weight: 100 900; font-stretch: 62% 100%; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ background: #fff; }}
body {{ position: relative; overflow: hidden; color: #000; font-family: Archivo, Arial, sans-serif; text-transform: lowercase;
        -webkit-font-smoothing: antialiased; }}
.logo {{ position: absolute; left: 50%; transform: translateX(-50%); display: block; }}
.photo {{ position: absolute; display: flex; align-items: flex-end; justify-content: center; }}
.photo img {{ width: 100%; height: 100%; object-fit: contain; object-position: 50% 100%; }}
.cell {{ position: absolute; overflow: hidden; }}
.cell img {{ width: 100%; height: 100%; object-fit: contain; display: block; }}
.title {{ position: absolute; font-weight: 400; letter-spacing: -0.035em; line-height: 1; }}
.sub {{ position: absolute; color: #636363; font-weight: 400; letter-spacing: -0.005em; line-height: 1.3; }}
.bar {{ position: absolute; left: 0; right: 0; background: #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }}
.bar .url {{ color: #a3a3a3; }}
.pill {{ position: absolute; background: #000; color: #fff; display: inline-flex; align-items: center; gap: 18px; white-space: nowrap; }}
.pill .url {{ color: #a3a3a3; }}
"""

def layout(size, c, frame_only=False):
    W, H = SIZES[size]
    multi = len(c["photos"]) > 1
    if size == "4x5":
        logo = f'<img class="logo" src="{LOGO}" style="top:52px;width:270px">'
        ph = (60, 172, W - 120, 846)
        txt = f'<div class="title" style="left:60px;top:1040px;font-size:{70 if len(c["title"])<12 else 60}px">{c["title"]}</div><div class="sub" style="left:62px;top:1132px;font-size:27px;width:960px">{c["sub"]}</div>'
        cta = f'<div class="bar" style="bottom:0;height:118px;padding:0 60px;font-size:29px"><span>{OFFER}</span><span class="url">{URL}</span></div>'
        grid = (2, 2)
    elif size == "9x16":
        logo = f'<img class="logo" src="{LOGO}" style="top:250px;width:330px">'
        ph = (70, 390, W - 140, 860)
        txt = f'<div class="title" style="left:72px;top:1285px;font-size:{86 if len(c["title"])<12 else 70}px">{c["title"]}</div><div class="sub" style="left:74px;top:1392px;font-size:29px;width:860px">{c["sub"]}</div>'
        cta = f'<div class="pill" style="left:72px;top:1462px;height:72px;padding:0 28px;font-size:28px"><span>{OFFER}</span></div>'
        grid = (2, 2)
    elif size == "1x1":
        logo = f'<img class="logo" src="{LOGO}" style="top:44px;width:220px">'
        ph = (60, 116, W - 120, 640)
        txt = f'<div class="title" style="left:60px;top:790px;font-size:{60 if len(c["title"])<12 else 50}px">{c["title"]}</div><div class="sub" style="left:62px;top:866px;font-size:23px;width:960px">{c["sub"]}</div>'
        cta = f'<div class="bar" style="bottom:0;height:96px;padding:0 60px;font-size:25px"><span>{OFFER}</span><span class="url">{URL}</span></div>'
        grid = (4, 1) if multi else (1, 1)
        if multi: ph = (60, 130, W - 120, 620)
    else:  # 1.91x1
        logo = f'<img src="{LOGO}" style="position:absolute;left:64px;top:62px;width:230px">'
        ph = (650, 24, 510, 580) if not multi else (600, 60, 560, 500)
        txt = f'<div class="title" style="left:62px;top:220px;font-size:{60 if len(c["title"])<12 else 46}px;width:520px">{c["title"]}</div><div class="sub" style="left:64px;top:{300 if len(c["title"])<12 else 290}px;font-size:22px;width:560px">{c["sub"]}</div>'
        cta = f'<div class="pill" style="left:64px;top:470px;height:60px;padding:0 24px;font-size:22px"><span>{OFFER}</span></div><div class="sub" style="left:64px;top:548px;font-size:20px">{URL}</div>'
        grid = (2, 2)
    x, y, w, h = ph
    if multi:
        cols, rows = grid
        gap = 12
        cw = (w - gap * (cols - 1)) / cols
        ch = (h - gap * (rows - 1)) / rows
        photo = "".join(f'<div class="cell" style="left:{x + (i % cols) * (cw + gap):.0f}px;top:{y + (i // cols) * (ch + gap):.0f}px;width:{cw:.0f}px;height:{ch:.0f}px"><img src="{img(k)}"></div>' for i, k in enumerate(c["photos"]))
    else:
        pos = ""
        if c.get("bleed"):  # the photo itself is cropped at the right edge, so let it run off the ad's edge
            w = W - x; pos = ' style="object-position:100% 100%"'
        photo = f'<div class="photo" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><img src="{img(c["photos"][0])}"{pos}></div>'
    body = logo + photo + txt + ("" if frame_only else cta)
    return W, H, f"<!doctype html><html><head><meta charset='utf-8'><style>{BASE_CSS} body{{width:{W}px;height:{H}px}}</style></head><body>{body}</body></html>"

def end_card():
    W, H = SIZES["9x16"]
    body = (f'<img class="logo" src="{LOGO}" style="top:640px;width:620px">'
            f'<div class="title" style="left:0;right:0;text-align:center;top:930px;font-size:84px">drop 001</div>'
            f'<div class="sub" style="left:0;right:0;text-align:center;top:1036px;font-size:30px">{DATES}</div>'
            f'<div class="pill" style="left:50%;transform:translateX(-50%);top:1110px;height:76px;padding:0 30px;font-size:30px"><span>{OFFER}</span></div>'
            f'<div class="sub" style="left:0;right:0;text-align:center;top:1214px;font-size:30px;color:#000">{URL}</div>')
    return W, H, f"<!doctype html><html><head><meta charset='utf-8'><style>{BASE_CSS} body{{width:{W}px;height:{H}px}}</style></head><body>{body}</body></html>"

def render(page, W, H, html, path):
    page.set_viewport_size({"width": W, "height": H})
    tmp = os.path.join(S, "ads", "_page.html")
    open(tmp, "w").write(html)
    page.goto("file://" + tmp, wait_until="load")
    page.evaluate("document.fonts.ready")
    bad = page.evaluate("[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)")
    font = page.evaluate("document.fonts.check('400 40px Archivo')")
    if bad or not font: print("PROBLEM", path, bad, font, file=sys.stderr)
    page.wait_for_timeout(150)
    page.screenshot(path=path, type="jpeg", quality=93, full_page=False)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(device_scale_factor=1)
    made = []
    for cname, c in CONCEPTS.items():
        for sname in SIZES:
            W, H, html = layout(sname, c)
            path = os.path.join(OUT, f"neverhollow-{cname}-{sname}.jpg")
            render(pg, W, H, html, path); made.append(path)
    # video frames (9:16): product frames without the offer, then an end card with it
    vf = os.path.join(S, "ads", "frames"); os.makedirs(vf, exist_ok=True)
    seq = [("drop001", "drop 001", "vesper-lying"), ("relic", "relic denim", "relic-sitting"),
           ("cathedral", "cathedral dress", "cathedral-seated"), ("requiem", "requiem sweatpants", "requiem-lying"),
           ("mnml", "mnml half zip", "mnml-front"), ("vesper", "vesper polo", "vesper-standing")]
    for i, (k, t, ph) in enumerate(seq):
        W, H, html = layout("9x16", dict(title=t, sub=(DATES if k == "drop001" else "drop 001 · pre-orders close november 5"), photos=[ph], bleed=(k == "cathedral")), frame_only=True)
        render(pg, W, H, html, os.path.join(vf, f"f{i}.jpg"))
    W, H, html = end_card(); render(pg, W, H, html, os.path.join(vf, f"f{len(seq)}.jpg"))
    b.close()
print("\n".join(made))
