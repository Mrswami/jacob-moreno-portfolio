"""
NEURAL-FLOW HD EMAIL SIGNATURE
- Pure Black Background (Hex #000000) for zero GIF noise.
- 2x Internally Oversampled Knight for anti-aliased trails.
- Neural-Flow Tracers: variable speeds, life-like movement.
- High-Contrast HD Text.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
import math, os, random

INPUT_PATH  = r"C:\Users\jmore\.gemini\antigravity\brain\26b44944-7624-4197-a330-c62bb1b6015d\jm_signature_v2_base_1772303914697.png"
OUTPUT_PATH = r"C:\Users\jmore\.gemini\antigravity\brain\26b44944-7624-4197-a330-c62bb1b6015d\jacob_moreno_signature.gif"

# ── 1. Setup Canvas @ 1X for Reference ───────────────────────────────────────
base = Image.open(INPUT_PATH).convert("RGB")
w0, h0 = base.size
base = base.crop((int(w0*0.07), int(h0*0.28), int(w0*0.93), int(h0*0.72)))
W1, H1 = 520, 130  # Final Display Size
base_1x = base.resize((W1, H1), Image.LANCZOS)

# Split Knight area (left) and Text area (right)
KNIGHT_END = int(W1 * 0.46)
base_1x_arr = np.array(base_1x)

# ── 2. Pure Black HD Optimization ───────────────────────────────────────────
# We force the background to pure black to eliminate GIF compression "grit".
def purify_black(img_arr, threshold=40):
    """Force near-black pixels to pure black."""
    bright = np.mean(img_arr, axis=2)
    img_arr[bright < threshold] = [0, 0, 0]
    return img_arr

knight_1x_clean = purify_black(base_1x_arr[:, :KNIGHT_END].copy(), threshold=35)
text_1x_clean = purify_black(base_1x_arr[:, KNIGHT_END:].copy(), threshold=30)

# Convert back to images for processing
knight_1x_base = Image.fromarray(knight_1x_clean)
text_1x_base = Image.fromarray(text_1x_clean)

# ── 3. Find Circuit Tracers @ 1X ─────────────────────────────────────────────
r, g, b = knight_1x_clean[:,:,0].astype(float), knight_1x_clean[:,:,1].astype(float), knight_1x_clean[:,:,2].astype(float)
bright = (r + g + b) / 3.0
is_circuit = (bright > 50) & ((b > r + 10) | (g > r + 10) | (bright > 100))
ys, xs = np.where(is_circuit)
circuit_pixels = list(zip(ys.tolist(), xs.tolist()))
circuit_set = set(circuit_pixels)

def get_path(start, max_len=65):
    path = [start]
    seen = {start}
    cur = start
    for _ in range(max_len):
        candidates = []
        for dy in [-1,0,1]:
            for dx in [-1,0,1]:
                if dy==0 and dx==0: continue
                nb = (cur[0]+dy, cur[1]+dx)
                if nb in circuit_set and nb not in seen:
                    candidates.append(nb)
        if not candidates: break
        # Strategy: pick candidate closest to original direction to minimize jitter
        nxt = random.choice(candidates)
        path.append(nxt)
        seen.add(nxt)
        cur = nxt
    return path

random.seed(42)
NUM_PATHS = 18
paths = []
all_pix_shuffled = circuit_pixels.copy()
random.shuffle(all_pix_shuffled)
visited = set()

for p in all_pix_shuffled:
    if p in visited or len(paths) >= NUM_PATHS: continue
    path = get_path(p)
    if len(path) > 15:
        paths.append(path)
        visited.update(path)

# Neural-Flow: Each path gets random speed and start frame
speeds = [random.uniform(0.6, 1.3) for _ in range(len(paths))]
starts = [random.randint(0, 100) for _ in range(len(paths))]
colors = [(0, 240, 255) if i%3!=1 else (122, 34, 255) for i in range(len(paths))] # Cyan/Violet bias

# ── 4. Internal Oversampling @ 2X for AA Glow ──────────────────────────────
W2, H2 = KNIGHT_END * 2, H1 * 2
knight_2x_base = knight_1x_base.resize((W2, H2), Image.LANCZOS)
knight_2x_base = ImageEnhance.Brightness(knight_2x_base).enhance(0.85)

def draw_glow_fixed(draw, cx, cy, color, intensity, radius):
    """Draw a soft LED bloom."""
    cr, cg, cb = color
    for r in range(radius, 0, -1):
        alpha = int((1.0 - r/(radius+1))**2 * intensity * 200)
        c = (int(cr*intensity*0.5), int(cg*intensity*0.5), int(cb*intensity*0.5), alpha)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c)
    # Hot core
    core = (min(255, int(cr*intensity+100)), min(255, int(cg*intensity+100)), min(255, int(cb*intensity+100)), int(intensity*255))
    draw.ellipse([cx-1, cy-1, cx+1, cy+1], fill=core)

# ── 5. Generate Frames ──────────────────────────────────────────────────────
NUM_FRAMES = 62
FRAME_DUR = 75 # Slower, more atmospheric
frames = []

for f in range(NUM_FRAMES):
    # Overlay @ 2X for Knight
    knight_2x_frame = knight_2x_base.copy().convert("RGBA")
    overlay_2x = Image.new("RGBA", (W2, H2), (0,0,0,0))
    draw_2x = ImageDraw.Draw(overlay_2x)

    for i, path in enumerate(paths):
        # Progress: time * speed + offset
        t = (f + starts[i]) * speeds[i]
        path_len = len(path)
        # Periodic movement
        cycle_t = t % (path_len + 30) # Path length + Pause
        if cycle_t < path_len:
            head_idx = int(cycle_t)
            color = colors[i]
            # Trail length
            trail_len = 14
            for j in range(trail_len):
                idx = head_idx - j
                if idx < 0: continue
                # Scale path to 2x for drawing
                py, px = path[idx]
                cx, cy = px * 2, py * 2
                
                intensity = (1.0 - j/trail_len)**2.2
                if j == 0:
                    draw_glow_fixed(draw_2x, cx, cy, color, intensity, radius=6)
                elif j < 4:
                    draw_glow_fixed(draw_2x, cx, cy, color, intensity*0.5, radius=3)
                else:
                    draw_2x.point((cx, cy), fill=(int(color[0]*intensity), int(color[1]*intensity), int(color[2]*intensity), int(intensity*180)))

    # Composite Knight @ 2X then downsample to 1X
    knight_2x_final = Image.alpha_composite(knight_2x_frame, overlay_2x).convert("RGB")
    knight_1x_final = knight_2x_final.resize((KNIGHT_END, H1), Image.LANCZOS)
    
    # Stitch Knight (Dynamic AA) + Text (Pure Static HD Black)
    full_frame = Image.new("RGB", (W1, H1))
    full_frame.paste(knight_1x_final, (0, 0))
    full_frame.paste(text_1x_base, (KNIGHT_END, 0))

    # Force Pure Black quantization (helps with GIF edges)
    # Using MAXCOVERAGE for best color fidelity on text antialiasing
    frames.append(full_frame.quantize(colors=256, method=Image.MAXCOVERAGE, dither=0))

# ── 6. Save ──────────────────────────────────────────────────────────────────
frames[0].save(
    OUTPUT_PATH,
    save_all=True,
    append_images=frames[1:],
    loop=0,
    duration=FRAME_DUR,
    optimize=True
)

size = os.path.getsize(OUTPUT_PATH)
print(f"✓ NEURAL-FLOW HD GIF saved: {OUTPUT_PATH}")
print(f"  Size: {size/1024:.1f} KB | {NUM_FRAMES} frames | ~4.6s loop")
