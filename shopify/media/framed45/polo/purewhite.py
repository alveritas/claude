"""Pure-white backdrop for white-on-white photos: every near-white pixel connected to the image border is
backdrop and becomes exactly 255 (1.2px soft edge). The garment's own whites are enclosed by its outline
and seams, so they are left alone. Usage: purewhite.py T in.jpg out.jpg [mask.png]"""
import sys, numpy as np, cv2
from PIL import Image
T = int(sys.argv[1]); src, out = sys.argv[2], sys.argv[3]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
L = rgb.mean(axis=2)
bright = (L >= T).astype(np.uint8)
n, lab = cv2.connectedComponents(bright, connectivity=4)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
bg = np.isin(lab, [b for b in border if b != 0]).astype(np.float32)
a = cv2.GaussianBlur(bg, (0, 0), 1.2)[..., None]
res = rgb * (1 - a) + 255 * a
res[bg.astype(bool)] = 255
Image.fromarray(np.clip(res, 0, 255).round().astype(np.uint8)).save(out, quality=92, subsampling=0, optimize=True, progressive=True)
if len(sys.argv) > 4: Image.fromarray(((1 - bg) * 255).astype(np.uint8)).save(sys.argv[4])
print(f"{src}: backdrop {bg.mean():.3f} of frame")
