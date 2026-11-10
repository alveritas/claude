"""Vesper Polo, Obsidian and Bone. The two colours were shot in the same position, so the black photo's
outline sets the scale and placement and the white photo gets exactly the same frame (a white shirt on white
can't be cut out reliably). Size: the black front matches the garment area of the current Vesper photo."""
import numpy as np, cv2
from PIL import Image
ns = {}; exec(open('../nov9b/frame2.py').read().split('jobs = json.load')[0], ns)
W, H = ns['W'], ns['H']
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
ref = load('../vesper-front.jpg').mean(2) < 245; ref_area = ref.sum()
scale = None
for side in ['front', 'back']:
    b, _ = ns['white_point'](load(f'originals/obsidian-{side}.jpg'))
    sil = ns['silhouette'](b, 150, 31)
    a = cv2.GaussianBlur(sil.astype(np.float32), (0, 0), 1.5)[..., None]
    b = b * a + 255 * (1 - a)
    x0, y0, x1, y1, area = ns['bbox_of'](sil)
    if scale is None: scale = (ref_area / area) ** 0.5
    gw, gh = ns['save'](b, (x0, y0, x1, y1), scale, f'vesper-obsidian-{side}.jpg')
    w, _ = ns['white_point'](load(f'originals/bone-{side}.jpg'))
    ns['save'](w, (x0, y0, x1, y1), scale, f'vesper-bone-{side}.jpg')
    print(f'{side}: scale {scale:.3f} garment {gw:.3f}W x {gh:.3f}H')
