"""Nocturnal reframe: centre the jacket's body (collar to cuffs), not the ties hanging below it.
Body = rows whose garment width is over 25% of the widest row. The body is scaled to a set share of the frame
height and its centre placed at a set height; the ties simply hang below it."""
import sys, numpy as np, cv2
from PIL import Image
sys.path.insert(0, '.')
W, H = 1792, 2240
def load(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
src = {"front": "originals/nocturnal-front.png", "back": "originals/nocturnal-back.png"}
BODY_H, CENTRE_Y = float(sys.argv[1]), float(sys.argv[2])
import importlib.util
spec = importlib.util.spec_from_file_location("f2", "frame2.py")
# reuse the helpers without running the job loop
code = open("frame2.py").read().split("jobs = json.load")[0]
ns = {}; exec(code, ns)
scale = None
for side in ["front", "back"]:
    rgb, wp = ns["white_point"](load(src[side]))
    sil = ns["silhouette"](rgb, 150, 31)
    a = cv2.GaussianBlur(sil.astype(np.float32), (0, 0), 1.5)[..., None]
    rgb = rgb * a + 255 * (1 - a)
    rows = sil.sum(1); mx = rows.max()
    body_rows = np.where(rows > 0.25 * mx)[0]
    y0, y1 = body_rows.min(), body_rows.max()
    body_cols = np.where(sil[y0:y1 + 1].any(0))[0]
    x0, x1 = body_cols.min(), body_cols.max()
    ys_all = np.where(sil.any(1))[0]
    if scale is None: scale = BODY_H * H / (y1 - y0)          # the back uses the front's scale
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    cx = (x0 + x1) / 2 * scale; cy = (y0 + y1) / 2 * scale
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    canvas.paste(im, (round(W / 2 - cx), round(CENTRE_Y * H - cy)))
    canvas.save(f"nocturnal-{side}.jpg", quality=92, subsampling=0, optimize=True, progressive=True)
    top = (CENTRE_Y * H - cy + ys_all.min() * scale) / H; bottom = (CENTRE_Y * H - cy + ys_all.max() * scale) / H
    print(f"{side}: scale {scale:.3f}  body {(y1-y0)*scale/H:.3f}H  top {top:.3f}  ties end {bottom:.3f}  width {(x1-x0)*scale/W:.3f}W")
