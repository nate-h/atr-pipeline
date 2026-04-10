# Dataset Credits

**Ships in Aerial Images**
Source: https://www.kaggle.com/datasets/siddharthkumarsah/ships-in-aerial-images/
Author: Siddharth Kumar Sah

## Reduction Process

The original dataset was reduced in two steps:

1. **10x reduction** — Randomly sampled 1/10 of images from each split (train, valid, test), deleting the rest along with their corresponding label files.
2. **2x reduction** — The already-reduced dataset was halved again using the same process.

| Split | Original | After 10x | After 2x |
|-------|----------|-----------|----------|
| train | 9,697    | 969       | 484      |
| valid | 2,165    | 216       | 108      |
| test  | 1,573    | 157       | 78       |

Sampling was done randomly with `random.seed(42)` for reproducibility. For every removed image, the corresponding `.txt` label file was also deleted to keep the dataset consistent.
