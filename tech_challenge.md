# Tech Challenge for AI-SAR company

- I found a kaggle dataset of aerial images of ships
- Used claude code and codex
- Styled it after company website theme
- I used Ultralytics YOLOv8 for object detection, specifically the yolov8n checkpoint
    - which is the nano variant.
    - It’s a lightweight pretrained PyTorch model that I fine-tuned on the ship dataset in YOLO annotation format
- CI checks for: type safety, linting/ formatting
- Uses docker, sqlalchemy
- Yes I intentionally checked in images

# Things I didn't get to

- Add automation around auto generated annotations that users can sign off on
    - I don't know how I feel about this but can help speed up things
- User authentication
- Haven't yet validated ingesting data
- Improve typing
- Could have better logging
- Add test and exercise in CI