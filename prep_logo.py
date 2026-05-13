from PIL import Image

# Use Concept C: The Circuit Knight
INPUT_PATH = r"C:\Users\jmore\.gemini\antigravity\brain\26b44944-7624-4197-a330-c62bb1b6015d\jm_static_logo_circuit_node_1772381654552.png"
OUTPUT_PATH = r"C:\Cursor Projects\portfolio_dev\assets\signature_logo.png"

img = Image.open(INPUT_PATH).convert("RGB")
W, H = img.size

# The generated logo is centered. We need a square crop around the knight.
# The image is 1024x1024. Let's use 65% to make sure we don't cut off the edges.
crop_size = int(W * 0.65) 
left = (W - crop_size) // 2
top = (H - crop_size) // 2
right = left + crop_size
bottom = top + crop_size

img_cropped = img.crop((left, top, right, bottom))
img_resized = img_cropped.resize((240, 240), Image.LANCZOS) # High-res square for crisp scaling

# We don't want the background to be #000000 on the signature because some clients don't do dark mode well.
# We'll export it as a transparent PNG by finding black pixels and making them alpha 0
img_rgba = img_resized.convert("RGBA")
data = img_rgba.getdata()
new_data = []
for item in data:
    # If pixel is very dark (close to black background), make it transparent
    if item[0] < 20 and item[1] < 20 and item[2] < 20:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append(item)
img_rgba.putdata(new_data)

img_rgba.save(OUTPUT_PATH, "PNG")
print(f"Saved optimized logo to {OUTPUT_PATH}")
