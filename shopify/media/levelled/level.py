"""Level laid-flat photos: every garment scaled to fit the same box (0.84W x 0.80H) on a 1792x2389 white
canvas and centred, so every card and gallery shows the pieces at one size and position.
usage: level.py jobs.json   (list of [name, src])  -> level/out/NAME.jpg (+ masks in level/work)"""
import sys, json, subprocess, shutil, numpy as np, cv2
from PIL import Image, ImageFilter
S = "/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad"
MODEL = S + "/models/isnet-general-use.onnx"; OUT = S + "/level/out"; WORK = S + "/level/work"
W, H = 1792, 2389; BW, BH = 0.84 * W, 0.80 * H; PAD = 40
jobs = json.load(open(sys.argv[1]))
srcs = []
for name, src in jobs:
    w = f"{WORK}/{name}-src.jpg"
    im = Image.open(src).convert("RGB")
    # fit the source into a 3:4 white frame first (never crop)
    sw, sh = im.size; tw, th = (sw, round(sw * 4 / 3)) if sw * 4 / 3 >= sh else (round(sh * 3 / 4), sh)
    c = Image.new("RGB", (tw, th), (255, 255, 255)); c.paste(im, ((tw - sw) // 2, (th - sh) // 2)); c.resize((W, H), Image.LANCZOS).save(w, quality=95)
    srcs.append(w)
subprocess.run([sys.executable, S + "/new2/isnet_mask.py", MODEL, WORK] + srcs, check=True, capture_output=True)
for name, _ in jobs:
    im = Image.open(f"{WORK}/{name}-src.jpg").convert("RGB")
    m = np.asarray(Image.open(f"{WORK}/{name}-mask.png").convert("L").resize((W, H), Image.BILINEAR)) > 110
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = [i for i in range(1, n) if st[i, 4] > 0.002 * m.size]
    x0 = min(st[i, 0] for i in keep); y0 = min(st[i, 1] for i in keep)
    x1 = max(st[i, 0] + st[i, 2] for i in keep); y1 = max(st[i, 1] + st[i, 3] for i in keep)
    gw, gh = x1 - x0, y1 - y0; s = min(BW / gw, BH / gh)
    cx0, cy0, cx1, cy1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    crop = im.crop((cx0, cy0, cx1, cy1)); cw, ch = round(crop.width * s), round(crop.height * s)
    crop = crop.resize((cw, ch), Image.LANCZOS)
    mk = Image.fromarray((m * 255).astype(np.uint8)).crop((cx0, cy0, cx1, cy1)).resize((cw, ch), Image.BILINEAR)
    cx = (x0 + x1) / 2 - cx0; cy = (y0 + y1) / 2 - cy0
    px, py = round(W / 2 - cx * s), round(H / 2 - cy * s)
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    f = 24; fm = Image.new("L", (cw, ch), 0); fm.paste(Image.new("L", (max(1, cw - 2 * f), max(1, ch - 2 * f)), 255), (f, f))
    canvas.paste(crop, (px, py), fm.filter(ImageFilter.GaussianBlur(f / 2)))
    canvas.save(f"{OUT}/{name}.jpg", quality=92, subsampling=0, optimize=True, progressive=True)
    full = Image.new("L", (W, H), 0); full.paste(mk, (px, py)); full.save(f"{WORK}/{name}-levelmask.png")
    print(f"{name:30s} was {gw/W:.2f}W x {gh/H:.2f}H  scale {s:.2f}")
