import os
import random

random.seed(42)

base = os.path.join(os.path.dirname(__file__), "ships-aerial-images")
splits = ["train", "valid", "test"]

for split in splits:
    images_dir = os.path.join(base, split, "images")
    labels_dir = os.path.join(base, split, "labels")

    images = sorted(os.listdir(images_dir))
    keep_count = len(images) // 2

    to_delete = random.sample(images, len(images) - keep_count)

    for img_file in to_delete:
        os.remove(os.path.join(images_dir, img_file))
        label_file = os.path.splitext(img_file)[0] + ".txt"
        label_path = os.path.join(labels_dir, label_file)
        if os.path.exists(label_path):
            os.remove(label_path)

    print(f"{split}: kept {keep_count} / {len(images)} images")
