import kagglehub
import shutil
import os

path = kagglehub.dataset_download("siddharthkumarsah/ships-in-aerial-images")

dest = os.path.dirname(__file__)
if os.path.exists(dest):
    shutil.rmtree(dest)
shutil.copytree(path, dest)

print("Dataset saved to:", dest)
