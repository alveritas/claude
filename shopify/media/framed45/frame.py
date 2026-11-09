"""Reframe product photos to 4:5 (1792x2240) on pure white, garment centred.
Background = pixels connected to the photo border that are close to the backdrop tone; only those turn white
(feathered 1px), so white print inside a garment and pale garments are never touched.
Scale: photos already levelled keep their relative size (x SCALE); new photos are sized to match a reference
garment area (the other side of the same piece, or the set median)."""
import sys, json, numpy as np, cv2
from PIL import Image
W, H = 1792, 2240
SCALE = 0.94
def load(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
def background(rgb, tol, T=None):
    L = rgb.mean(axis=2); chroma = rgb.max(axis=2) - rgb.min(axis=2)
    h, w = L.shape
    border = np.concatenate([L[0], L[-1], L[:, 0], L[:, -1]])
    bg = np.median(border)
    thr = T if T is not None else bg - tol
    cand = ((L >= thr) & (chroma < 25)).astype(np.uint8)
    n, lab = cv2.connectedComponents(cand, connectivity=4)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    R = np.isin(lab, list(edge_labels))
    return R, bg
def garment_bbox(R):
    g = (~R).astype(np.uint8)
    g = cv2.morphologyEx(g, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(g)
    keep = [i for i in range(1, n) if st[i, 4] > 0.0005 * g.size]
    x0 = min(st[i, 0] for i in keep); y0 = min(st[i, 1] for i in keep)
    x1 = max(st[i, 0] + st[i, 2] for i in keep); y1 = max(st[i, 1] + st[i, 3] for i in keep)
    area = sum(st[i, 4] for i in keep)
    return (x0, y0, x1, y1), area
def whiten(rgb, R):
    a = cv2.GaussianBlur(R.astype(np.float32), (0, 0), 0.8)
    a = np.clip(a, 0, 1)[..., None]
    return rgb * (1 - a) + 255 * a
def render(rgb, bbox, s, out, check=True):
    x0, y0, x1, y1 = bbox
    h, w = rgb.shape[:2]
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    if abs(s - 1) > 1e-3: im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    cx, cy = (x0 + x1) / 2 * s, (y0 + y1) / 2 * s
    ox, oy = round(W / 2 - cx), round(H / 2 - cy)
    canvas = Image.new("RGB", (W, H), (255, 255, 255)); canvas.paste(im, (ox, oy))
    gw, gh = (x1 - x0) * s, (y1 - y0) * s
    canvas.save(out, quality=92, subsampling=0, optimize=True, progressive=True)
    return gw / W, gh / H
if __name__ == "__main__":
    jobs = json.load(open(sys.argv[1]))
    res = {}
    for j in jobs:
        rgb = load(j["src"])
        R, bg = background(rgb, j.get("tol", 22), j.get("T"))
        bbox, area = garment_bbox(R)
        if not j.get("keepbg"): rgb = whiten(rgb, R)
        j["_bbox"], j["_area"], j["_bg"] = bbox, area, bg
        res[j["name"]] = j
        j["_rgb"] = rgb
    for j in jobs:
        if "crop" in j:   # close-up: 4:5 window around a focus point, no rescale
            rgb = j["_rgb"]; h, w = rgb.shape[:2]
            cw = w; ch = round(cw * 5 / 4)
            if ch > h: ch = h; cw = round(ch * 4 / 5)
            fy = j["crop"]; top = int(min(max(0, fy * h - ch / 2), h - ch))
            left = (w - cw) // 2
            Image.fromarray(np.clip(rgb[top:top + ch, left:left + cw], 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS).save(j["out"], quality=92, subsampling=0, optimize=True, progressive=True)
            print(f'{j["name"]:28s} close-up crop'); continue
        if "match" in j:
            ref = res[j["match"]]; refs = ref.get("_s", SCALE)
            s = (ref["_area"] * refs ** 2 / j["_area"]) ** 0.5
        else:
            s = j.get("scale", SCALE)
        j["_s"] = s
        fw, fh = render(j["_rgb"], j["_bbox"], s, j["out"])
        flag = "  <-- tight" if fw > 0.9 or fh > 0.9 else ""
        print(f'{j["name"]:28s} bg {j["_bg"]:.0f} scale {s:.3f} garment {fw:.2f}W x {fh:.2f}H{flag}')
