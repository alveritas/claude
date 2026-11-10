"""4:5 (1792x2240) pure-white framing for new photos.
method 'dark'  : black/dark garment. White point lifted so the backdrop reads 255, then the garment outline is
                 found from its dark pixels (closed + holes filled, so prints and script inside it are kept whole)
                 and everything outside the outline turns white with a 1.5px soft edge.
method 'light' : white garment on white. White point lift only (cutting would bite into the shirt).
method 'crop'  : close-up. White point lift only, then a 4:5 window around a focus point.
Size: 'match' another job's garment area (fronts to the current photo of the same piece, backs to their front),
or 'fit' a box (fraction of width/height)."""
import sys, json, numpy as np, cv2
from PIL import Image
W, H = 1792, 2240
def load(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
def white_point(rgb, wp=None):
    if wp is None:
        h, w = rgb.shape[:2]
        b = np.concatenate([rgb[:30].reshape(-1, 3), rgb[-30:].reshape(-1, 3), rgb[:, :30].reshape(-1, 3), rgb[:, -30:].reshape(-1, 3)])
        wp = np.median(b, axis=0)
        if wp.mean() < 200: wp = np.percentile(rgb.reshape(-1, 3), 99.7, axis=0)
    wp = np.clip(np.asarray(wp, np.float32), 200, 255)
    return np.clip(rgb * (255.0 / wp), 0, 255), wp
def silhouette(rgb, thr, k):
    L = rgb.mean(axis=2)
    m = (L < thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 0.002 * m.size: keep[lab == i] = 1
    # fill holes (anything not reachable from the border is inside the garment)
    inv = (1 - keep).astype(np.uint8)
    n2, lab2 = cv2.connectedComponents(inv)
    border = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]])))
    holes = np.isin(lab2, [l for l in range(1, n2) if l not in border])
    return (keep.astype(bool) | holes)
def bbox_of(mask):
    ys, xs = np.where(mask); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, mask.sum()
def save(rgb, bbox, s, out):
    x0, y0, x1, y1 = bbox; h, w = rgb.shape[:2]
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    if abs(s - 1) > 1e-3: im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    cx, cy = (x0 + x1) / 2 * s, (y0 + y1) / 2 * s
    canvas = Image.new("RGB", (W, H), (255, 255, 255)); canvas.paste(im, (round(W / 2 - cx), round(H / 2 - cy)))
    canvas.save(out, quality=92, subsampling=0, optimize=True, progressive=True)
    return (x1 - x0) * s / W, (y1 - y0) * s / H
jobs = json.load(open(sys.argv[1])); res = {}
for j in jobs:
    rgb = load(j["src"]); meth = j["method"]
    if meth == "ref":   # an existing framed photo: only its garment area is needed
        L = rgb.mean(axis=2); m = L < 245; x0, y0, x1, y1, area = bbox_of(m); j["_area"] = area; j["_s"] = 1.0; res[j["name"]] = j; continue
    rgb, wp = white_point(rgb, j.get("wp"))
    if meth == "crop":
        h, w = rgb.shape[:2]; cw = w; ch = round(cw * 5 / 4)
        if ch > h: ch = h; cw = round(ch * 4 / 5)
        fx, fy = j.get("focus", [0.5, 0.5])
        top = int(min(max(0, fy * h - ch / 2), h - ch)); left = int(min(max(0, fx * w - cw / 2), w - cw))
        Image.fromarray(np.clip(rgb[top:top + ch, left:left + cw], 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS).save(j["out"], quality=92, subsampling=0, optimize=True, progressive=True)
        print(f'{j["name"]:26s} close-up, white point {wp.round()}'); res[j["name"]] = j; continue
    if meth == "dark":
        sil = silhouette(rgb, j.get("thr", 150), j.get("k", 31))
        a = cv2.GaussianBlur(sil.astype(np.float32), (0, 0), 1.5)[..., None]
        rgb = rgb * a + 255 * (1 - a)
        x0, y0, x1, y1, area = bbox_of(sil)
    else:  # light
        L = rgb.mean(axis=2); m = (L < j.get("thr", 240)).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m)
        keep = np.isin(lab, [i for i in range(1, n) if st[i, 4] > 2000])
        x0, y0, x1, y1, area = bbox_of(keep)
    j["_area"] = area
    if "match" in j:
        ref = res[j["match"]]; s = (ref["_area"] * ref["_s"] ** 2 / area) ** 0.5
    else:
        fw, fh = j.get("fit", [0.86, 0.86]); s = min(fw * W / (x1 - x0), fh * H / (y1 - y0))
    j["_s"] = s; res[j["name"]] = j
    gw, gh = save(rgb, (x0, y0, x1, y1), s, j["out"])
    print(f'{j["name"]:26s} {meth:5s} wp {wp.round()} scale {s:.3f} garment {gw:.2f}W x {gh:.2f}H' + ("  <-- TIGHT" if gw > .92 or gh > .92 else ""))
