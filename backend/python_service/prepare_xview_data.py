import os
import json
import shutil
from PIL import Image
from tqdm import tqdm
import pandas as pd

# ================= CONFIGURATION =================
XVIEW_PATH = "/content/drive/MyDrive/xview_data"
OUTPUT_DATA_PATH = "data_4_class"

CLASSES = {
    "no-damage": "no_damage",
    "minor-damage": "low_damage",
    "major-damage": "medium_damage",
    "destroyed": "destroyed"
}
# ==================================================


def create_folders():
    """Creates output folder structure."""
    if os.path.exists(OUTPUT_DATA_PATH):
        print(f"Warning: Output path '{OUTPUT_DATA_PATH}' already exists. Deleting it.")
        shutil.rmtree(OUTPUT_DATA_PATH)

    for split in ["train", "val"]:
        for class_name in CLASSES.values():
            os.makedirs(os.path.join(OUTPUT_DATA_PATH, split, class_name), exist_ok=True)
    print(f"Created folder structure at '{OUTPUT_DATA_PATH}'")


def get_image_paths(image_id):
    """Return pre- and post-disaster image paths based on image_id."""
    base_name = image_id.replace("_post_disaster", "").replace("_pre_disaster", "")
    pre_path = os.path.join(XVIEW_PATH, "images", f"{base_name}_pre_disaster.png")
    post_path = os.path.join(XVIEW_PATH, "images", f"{base_name}_post_disaster.png")

    if not os.path.exists(pre_path) or not os.path.exists(post_path):
        return None, None
    return pre_path, post_path


def load_all_annotations():
    """Loads and concatenates all building annotations."""
    labels_path = os.path.join(XVIEW_PATH, "labels")
    label_files = [f for f in os.listdir(labels_path) if f.endswith(".json")]

    all_rows = []
    for file in tqdm(label_files, desc="Loading JSON files"):
        file_path = os.path.join(labels_path, file)
        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            features = data.get("features", {}).get("xy", [])
            image_id = file.replace(".json", "")
            for feat in features:
                prop = feat.get("properties", {})
                wkt = feat.get("wkt", "")
                if not wkt or prop.get("feature_type") != "building":
                    continue
                row = {
                    "image_id": image_id,
                    "wkt": wkt,
                    "subtype": prop.get("subtype", None),
                    "uid": prop.get("uid", None)
                }
                all_rows.append(row)

        except Exception as e:
            print(f"⚠️ Could not read {file}: {e}")

    df = pd.DataFrame(all_rows)
    print(f"✅ Parsed {len(df)} building annotations from {len(label_files)} files.")
    return df


def polygon_to_bbox(wkt):
    """Converts a WKT polygon string to a bounding box (xmin, ymin, xmax, ymax)."""
    try:
        points_str = wkt.replace("POLYGON ((", "").replace("))", "")
        points = [tuple(map(float, p.split())) for p in points_str.split(",")]
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        if not xs or not ys:
            return None
        return (min(xs), min(ys), max(xs), max(ys))
    except Exception:
        return None


def process_data():
    create_folders()

    df = load_all_annotations()
    if df.empty:
        print("Error: No annotation data loaded.")
        return

    grouped = df.groupby("image_id")

    train_count = val_count = 0
    print("Processing images and cropping buildings...")

    for i, (image_id, group) in enumerate(tqdm(grouped, total=len(grouped), desc="Processing images")):
        pre_path, post_path = get_image_paths(image_id)
        if not pre_path or not post_path:
            continue

        try:
            post_image = Image.open(post_path).convert("RGB")
        except Exception:
            continue

        split = "val" if i % 10 == 0 else "train"

        for _, row in group.iterrows():
            damage_level = row["subtype"]
            if damage_level not in CLASSES:
                continue

            bbox = polygon_to_bbox(row["wkt"])
            if not bbox:
                continue

            if bbox[0] >= bbox[2] or bbox[1] >= bbox[3]:
                continue

            cropped = post_image.crop(bbox)
            if cropped.size[0] == 0 or cropped.size[1] == 0:
                continue

            class_name = CLASSES[damage_level]
            uid = row["uid"] or f"{image_id}_{_}"
            save_path = os.path.join(OUTPUT_DATA_PATH, split, class_name, f"{uid}.png")

            try:
                cropped.save(save_path)
                if split == "train":
                    train_count += 1
                else:
                    val_count += 1
            except Exception:
                continue

    print("\n--- ✅ Data Preparation Complete! ---")
    print(f"Total training images: {train_count}")
    print(f"Total validation images: {val_count}")
    print(f"Data saved to: {OUTPUT_DATA_PATH}")


if __name__ == "__main__":
    process_data()
