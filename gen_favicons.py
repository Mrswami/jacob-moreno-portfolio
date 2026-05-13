"""
Generates all favicon sizes from the existing signature_logo.png and outputs:
  - favicon.ico (multi-size: 16, 32, 48)
  - favicon-16x16.png
  - favicon-32x32.png
  - favicon-180x180.png (Apple Touch Icon)
  - favicon-192x192.png (Android Chrome)
  - favicon-512x512.png (Android Chrome splash)
"""

from PIL import Image
import os

INPUT = r"C:\Users\jmore\.gemini\antigravity\brain\26b44944-7624-4197-a330-c62bb1b6015d\favicon_jm_bold_mono_1772422939604.png"
OUT_DIR = r"C:\Cursor Projects\portfolio_dev"

img = Image.open(INPUT).convert("RGBA")

# Auto-crop transparent padding so the icon fills the frame
# Get bounding box of non-transparent content
bbox = img.getbbox()
img = img.crop(bbox)

def make_icon(size):
    """Resize onto a square transparent canvas."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    thumb = img.copy()
    # Fit image with a small margin
    max_dim = int(size * 0.85)
    thumb.thumbnail((max_dim, max_dim), Image.LANCZOS)
    offset = ((size - thumb.width) // 2, (size - thumb.height) // 2)
    canvas.paste(thumb, offset, thumb)
    return canvas

sizes = {
    "favicon-16x16.png":  16,
    "favicon-32x32.png":  32,
    "favicon-180x180.png": 180,  # Apple Touch
    "favicon-192x192.png": 192,  # Android
    "favicon-512x512.png": 512,  # PWA splash
}

for filename, size in sizes.items():
    icon = make_icon(size)
    icon.save(os.path.join(OUT_DIR, filename))
    print(f"  ✓ {filename} ({size}x{size})")

# .ico: multi-resolution in a single file
ico_images = [make_icon(s).convert("RGBA") for s in [16, 32, 48]]
ico_path = os.path.join(OUT_DIR, "favicon.ico")
ico_images[0].save(ico_path, format="ICO", sizes=[(16,16),(32,32),(48,48)],
                   append_images=ico_images[1:])
print(f"  ✓ favicon.ico (16/32/48 multi-size)")
print("\nAll favicons generated!")
