"""NEVERHOLLOW photo grade: neutral concrete, clean whites, rich blacks, a little less colour.

The lifestyle shots were warm and a bit murky next to the pure-white site and the white-background
flat-lays. This takes the warm cast out (measured on the grey surfaces in each photo, per brightness band),
brings every photo to the same exposure, sets clean black and white points, adds a gentle contrast curve
and pulls saturation back slightly. Pure black and pure white are left exactly as they are.

usage: python3 grade.py SRC OUT [--strength 1.0]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

TARGET_MID = 128.0      # median brightness of the grey surfaces after grading (0-255)
TARGET_CAST = (0.0, 1.2)  # (R-G, B-G) on grey surfaces: neutral with the faintest cool lean
SAT = 0.90              # saturation multiplier
BLACK_PCT, WHITE_PCT = 0.25, 99.85
BLACK_TO, WHITE_TO = 3.0, 250.0
CONTRAST = 0.22         # strength of the S-curve (0 = none)
CLARITY = 0.05          # local contrast on mid-tones
CLARITY_RADIUS = 0.012  # as a fraction of image width


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def neutral_mask(a):
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6)
    y = luma(a)
    return (sat < 0.14) & (y > 24) & (y < 236)


def cast_curve(a, mask, bins=14):
    """Median (R-G, B-G) of grey surfaces in each brightness band, as smooth functions of brightness."""
    y = luma(a)[mask]
    rg = (a[..., 0] - a[..., 1])[mask]
    bg = (a[..., 2] - a[..., 1])[mask]
    edges = np.linspace(0, 255, bins + 1)
    centres, mrg, mbg = [], [], []
    for i in range(bins):
        sel = (y >= edges[i]) & (y < edges[i + 1])
        if sel.sum() > 400:
            centres.append((edges[i] + edges[i + 1]) / 2)
            mrg.append(np.median(rg[sel]))
            mbg.append(np.median(bg[sel]))
    centres = np.array(centres)
    return centres, np.array(mrg), np.array(mbg)


def grade(img, strength=1.0):
    a = np.asarray(img.convert("RGB")).astype(np.float64)
    h, w, _ = a.shape
    y0 = luma(a)
    mask = neutral_mask(a)

    # 1. take out the colour cast, band by band, leaving pure black and white alone
    c, mrg, mbg = cast_curve(a, mask)
    if len(c) >= 2:
        drg = np.interp(y0, c, mrg) - TARGET_CAST[0]
        dbg = np.interp(y0, c, mbg) - TARGET_CAST[1]
        taper = smoothstep(0, 28, y0) * (1 - smoothstep(228, 255, y0)) * strength
        dR, dB = -drg * taper, -dbg * taper
        a[..., 0] += dR
        a[..., 2] += dB
        a -= (0.299 * dR + 0.114 * dB)[..., None]   # keep brightness where it was

    # 2. tones, on brightness only (YCbCr)
    a = np.clip(a, 0, 255)
    Y = luma(a)
    Cb = -0.168736 * a[..., 0] - 0.331264 * a[..., 1] + 0.5 * a[..., 2]
    Cr = 0.5 * a[..., 0] - 0.418688 * a[..., 1] - 0.081312 * a[..., 2]

    lo, hi = np.percentile(Y, BLACK_PCT), np.percentile(Y, WHITE_PCT)
    lo = min(lo, 12.0)          # never lift a real black into grey
    t = np.clip((Y - lo) / max(1.0, hi - lo), 0, 1)
    # same exposure for every photo: move the grey surfaces' median to the target with a gamma
    m = np.median(np.clip((y0[mask] - lo) / max(1.0, hi - lo), 1e-4, 1)) if mask.sum() > 1000 else 0.5
    target = (TARGET_MID - BLACK_TO) / (WHITE_TO - BLACK_TO)
    g = np.log(target) / np.log(m)
    g = 1 + (g - 1) * strength
    g = float(np.clip(g, 0.7, 1.35))
    t = t ** g
    # gentle S-curve around the middle
    s = t + CONTRAST * strength * (t - 0.5) * (1 - np.abs(2 * t - 1)) * 2
    s = np.clip(s, 0, 1)
    Yn = BLACK_TO + s * (WHITE_TO - BLACK_TO)
    # keep pure black/white pure
    Yn = np.where(Y <= 0.5, 0, Yn)
    Yn = np.where(Y >= 254.5, 255, Yn)

    # 3. a little local contrast in the mid-tones so concrete and fabric read crisply
    if CLARITY > 0:
        r = max(2, int(w * CLARITY_RADIUS))
        blur = np.asarray(Image.fromarray(np.clip(Yn, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float64)
        mid = smoothstep(10, 70, Yn) * (1 - smoothstep(185, 245, Yn))
        Yn = Yn + CLARITY * strength * (Yn - blur) * mid

    # 4. a little less colour
    k = 1 - (1 - SAT) * strength
    Cb, Cr = Cb * k, Cr * k

    R = Yn + 1.402 * Cr
    G = Yn - 0.344136 * Cb - 0.714136 * Cr
    B = Yn + 1.772 * Cb
    out = np.clip(np.stack([R, G, B], -1), 0, 255)
    return Image.fromarray((out + 0.5).astype(np.uint8))


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    strength = float(sys.argv[sys.argv.index("--strength") + 1]) if "--strength" in sys.argv else 1.0
    im = Image.open(src)
    icc = im.info.get("icc_profile")
    out = grade(im, strength)
    kw = {"quality": 92, "subsampling": 0, "optimize": True, "progressive": True}
    if icc:
        kw["icc_profile"] = icc
    out.save(dst, **kw)
    print(dst, out.size)
