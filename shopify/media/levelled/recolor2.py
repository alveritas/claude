"""Natural colour versions from a real laid-flat photo (levelled). Nothing is inverted: the photo's light and
shade keep their direction (folds stay shadows), only the fabric's base tone moves to the other colour, with
the shading contrast scaled the way that colour shows it. Print and embroidery (marks clearly lighter or darker
than the fabric) take the opposite ink, as on the real pieces (obsidian = white script, bone = black script).
Backdrop and the soft shadow under the piece stay exactly as photographed.
usage: recolor2.py NAME:TARGET:SWAP[,NAME:TARGET:SWAP...]   TARGET bone|obsidian|snow, SWAP 1|0  -> level/out/NAME-TARGET.jpg"""
import sys, numpy as np, cv2
from PIL import Image, ImageFilter
S = "/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad"
OUT = S + "/level/out"; WORK = S + "/level/work"
def load(n):
    rgb = np.asarray(Image.open(f"{OUT}/{n}.jpg").convert("RGB")).astype(np.float32)
    a = np.asarray(Image.open(f"{WORK}/{n}-levelmask.png").convert("L")).astype(np.float32) / 255
    return rgb, a
def fabric(n):  # median colour of the plain fabric (inside, away from print)
    rgb, a = load(n); L = rgb.mean(2); inner = cv2.erode((a > 0.5).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    base = np.median(L[inner]); plain = inner & (np.abs(L - base) < 25)
    return np.median(rgb[plain], axis=0)
TONE = {"bone": fabric("spine-front"), "obsidian": fabric("vesper-front")}
TONE["snow"] = TONE["bone"] * 0 + np.array([238, 238, 236.0])
print("bone", TONE["bone"].round(), "obsidian", TONE["obsidian"].round())
def ss(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
for job in sys.argv[1].split(","):
    n, target, swap = job.split(":"); swap = swap == "1"
    rgb, a = load(n); L = rgb.mean(2)
    inner = cv2.erode((a > 0.5).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32)
    inner = cv2.GaussianBlur(inner, (0, 0), 2)
    core = inner > 0.5
    base = float(np.median(L[core])); T = TONE[target]; t = float(T.mean())
    dark_src = base < 128
    # shading relative to the fabric, with highlights and shadows kept in their direction
    d = L - base
    if dark_src and t > 128:      # black -> light: a light fabric shows its folds more strongly, mostly as shade
        k_sh, k_hi = 1.9, 0.5
    elif not dark_src and t < 128:  # light -> black: folds read softer on black
        k_sh, k_hi = 0.45, 0.55
    else:                          # same family (slate -> obsidian / snow)
        k_sh, k_hi = (0.75, 0.75) if t < 128 else (0.8, 0.5)
    if dark_src and t > 128:
        # on black fabric the lit side of a fold is brighter; on white fabric the same fold casts shade below it:
        # use the local light/dark structure but keep its sign, so lit stays lit and shaded stays shaded
        dd = d - cv2.GaussianBlur(d, (0, 0), 40) * 0.5
        val = t + np.where(dd < 0, dd * k_sh, dd * k_hi)
    else:
        val = t + np.where(d < 0, d * k_sh, d * k_hi)
    fab = np.clip(val[..., None] * (T / t), 0, 255)
    out = fab
    if swap:
        if dark_src:   # light marks on dark fabric -> dark ink
            g = ss(base + 95, base + 165, L) * inner
            ink = np.clip(28 + (255 - L) * 0.18, 18, 70)[..., None] * np.ones(3)
        else:          # dark marks on light fabric -> light ink
            g = ss(base - 115, base - 175, L) * inner
            ink = np.clip(238 - L * 0.15, 205, 245)[..., None] * np.array([1, 0.995, 0.98])
        g = cv2.GaussianBlur(g, (0, 0), 0.8)[..., None]
        out = (1 - g) * fab + g * ink
    # carry the new colour to the garment's very edge (a few pixels past the mask), so no outline of the old
    # colour is left; outside the piece the same mapping lands on the white backdrop, so nothing else changes
    grow = cv2.dilate((a > 0.25).astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32)
    am = cv2.GaussianBlur(grow, (0, 0), 1.5)[..., None]
    res = am * out + (1 - am) * rgb
    Image.fromarray(np.clip(res + 0.5, 0, 255).astype(np.uint8)).save(f"{OUT}/{n}-{target}.jpg", quality=92, subsampling=0, optimize=True, progressive=True)
    print(n, target, "base", round(base, 1))
