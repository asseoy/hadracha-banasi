"""Cut the tribe logo into a clean round mark + sizes for the site."""
from PIL import Image, ImageDraw, ImageFilter
import os
SRC = r'C:\Users\Eitan\Downloads\WhatsApp Image 2026-10-07 at 14.51.59.jpeg'
OUT = os.path.join(os.path.dirname(__file__), '..', 'app', 'img')
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()

def dark(p):
    return sum(p) < 150

# find the black outer ring on the horizontal and vertical lines through the middle
cy = H // 2
left = next(x for x in range(W) if dark(px[x, cy]))
right = next(x for x in range(W - 1, 0, -1) if dark(px[x, cy]))
cx = (left + right) // 2
top = next(y for y in range(H) if dark(px[cx + 120, y]) or dark(px[cx - 120, y]))
r = (right - left) / 2
print('ring', left, right, top, 'center', cx, 'r', r)
cy = int(top + r * 0.99) if top < cy else cy
# square crop around the ring, padded so the hand at the bottom is not clipped harshly
pad = 6
box = (int(cx - r - pad), int(cy - r - pad), int(cx + r + pad), int(cy + r + pad))
sq = Image.new('RGB', (box[2] - box[0], box[3] - box[1]), (229, 36, 27))
sq.paste(im.crop((max(box[0], 0), max(box[1], 0), min(box[2], W), min(box[3], H))), (max(0, -box[0]), max(0, -box[1])))
S = sq.size[0]
# round mark with transparent outside
big = 4
mask = Image.new('L', (S * big, S * big), 0)
ImageDraw.Draw(mask).ellipse((0, 0, S * big - 1, S * big - 1), fill=255)
mask = mask.resize((S, S), Image.LANCZOS)
round_ = sq.copy().convert('RGBA'); round_.putalpha(mask)
for size in (512, 192, 96, 64):
    round_.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f'logo-{size}.png'), optimize=True)
# app icon: the whole artwork on the red field, square
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
for f in os.listdir(OUT):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
