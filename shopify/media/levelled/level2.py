"""Second pass: equal visual size. Each garment is scaled so it covers the same share of the frame (its mask
area), capped so it never exceeds 0.88W x 0.84H, then centred on its bounding box. Front and back of a piece
come out the same size, and wide and tall pieces read as one set. Uses the masks level.py made.
usage: level2.py jobs.json [target_share]"""
import sys, json, numpy as np, cv2
from PIL import Image, ImageFilter
S = "/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad"
OUT = S + "/level/out"; WORK = S + "/level/work"
W, H = 1792, 2389; CW, CH = 0.88 * W, 0.84 * H; PAD = 40
jobs = json.load(open(sys.argv[1]))
info = []
for name, _ in jobs:
    m = np.asarray(Image.open(f"{WORK}/{name}-mask.png").convert("L").resize((W, H), Image.BILINEAR)) > 110
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = [i for i in range(1, n) if st[i, 4] > 0.002 * m.size]
    area = sum(st[i, 4] for i in keep)
    x0 = min(st[i, 0] for i in keep); y0 = min(st[i, 1] for i in keep)
    x1 = max(st[i, 0] + st[i, 2] for i in keep); y1 = max(st[i, 1] + st[i, 3] for i in keep)
    info.append((name, area, (x0, y0, x1, y1)))
target = float(sys.argv[2]) if len(sys.argv) > 2 else float(np.median([a / (W * H) for _, a, _ in info]))
print("target share", round(target, 3))
for name, area, (x0, y0, x1, y1) in info:
    im = Image.open(f"{WORK}/{name}-src.jpg").convert("RGB")
    gw, gh = x1 - x0, y1 - y0
    s = min((target * W * H / area) ** 0.5, CW / gw, CH / gh)
    cx0, cy0, cx1, cy1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    crop = im.crop((cx0, cy0, cx1, cy1)); cw, ch = round(crop.width * s), round(crop.height * s)
    crop = crop.resize((cw, ch), Image.LANCZOS)
    cx = (x0 + x1) / 2 - cx0; cy = (y0 + y1) / 2 - cy0
    px, py = round(W / 2 - cx * s), round(H / 2 - cy * s)
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    f = 24; fm = Image.new("L", (cw, ch), 0); fm.paste(Image.new("L", (max(1, cw - 2 * f), max(1, ch - 2 * f)), 255), (f, f))
    canvas.paste(crop, (px, py), fm.filter(ImageFilter.GaussianBlur(f / 2)))
    canvas.save(f"{OUT}/{name}.jpg", quality=92, subsampling=0, optimize=True, progressive=True)
    mfull = Image.open(f"{WORK}/{name}-mask.png").convert("L").resize((W, H), Image.BILINEAR).crop((cx0, cy0, cx1, cy1)).resize((cw, ch), Image.BILINEAR)
    full = Image.new("L", (W, H), 0); full.paste(mfull, (px, py)); full.save(f"{WORK}/{name}-levelmask.png")
    print(f"{name:20s} share {area/(W*H):.3f} scale {s:.2f} -> {gw*s/W:.2f}W x {gh*s/H:.2f}H")
