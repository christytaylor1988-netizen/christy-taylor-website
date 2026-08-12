from PIL import Image, ImageCms, ImageChops
from pathlib import Path
from io import BytesIO

INPUT = Path("images/print-previews")
OUTPUT = Path("images/shop-previews")

CANVAS_W = 1600
CANVAS_H = 2000

BG = (255, 255, 255)

MAX_W = 1350
MAX_H = 1650

OUTPUT.mkdir(parents=True, exist_ok=True)

SRGB_PROFILE = ImageCms.createProfile("sRGB")
SRGB_PROFILE_BYTES = ImageCms.ImageCmsProfile(SRGB_PROFILE).tobytes()


def trim_light_grey_border(img):
    """
    Removes a uniform very-light-grey outer border if one exists.
    Leaves normal artwork/white paper untouched.
    """

    corner = img.getpixel((0, 0))

    # Only attempt trimming if the outer colour is very light
    if not all(225 <= value <= 250 for value in corner):
        return img

    background = Image.new("RGB", img.size, corner)
    diff = ImageChops.difference(img, background)

    # Slightly amplify tiny differences so the real image is detected
    diff = diff.point(lambda p: 0 if p < 12 else p)

    bbox = diff.getbbox()

    if bbox:
        return img.crop(bbox)

    return img


for path in INPUT.iterdir():

    if path.suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp"]:
        continue

    with Image.open(path) as source:

        icc_profile = source.info.get("icc_profile")

        if icc_profile:
            try:
                input_profile = ImageCms.ImageCmsProfile(BytesIO(icc_profile))

                img = ImageCms.profileToProfile(
                    source,
                    input_profile,
                    SRGB_PROFILE,
                    outputMode="RGB"
                )

            except Exception:
                img = source.convert("RGB")

        else:
            img = source.convert("RGB")

        img = trim_light_grey_border(img)

        img.thumbnail(
            (MAX_W, MAX_H),
            Image.Resampling.LANCZOS
        )

        canvas = Image.new(
            "RGB",
            (CANVAS_W, CANVAS_H),
            BG
        )

        x = (CANVAS_W - img.width) // 2
        y = (CANVAS_H - img.height) // 2

        canvas.paste(img, (x, y))

        output_path = OUTPUT / f"{path.stem}.jpg"

        canvas.save(
            output_path,
            "JPEG",
            quality=95,
            subsampling=0,
            optimize=True,
            icc_profile=SRGB_PROFILE_BYTES
        )

        print("Made:", output_path)

print("DONE")