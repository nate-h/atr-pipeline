import { useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { appConfig } from "../lib/config";
import type { AnnotationBox } from "../types/api";

type SplitName = "train" | "valid" | "test";

interface DraftBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function AnnotationPage() {
  const queryClient = useQueryClient();
  const [split, setSplit] = useState<SplitName>("train");
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  const [boxes, setBoxes] = useState<AnnotationBox[]>([]);
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const imagesQuery = useQuery({
    queryKey: ["annotation-images", split],
    queryFn: () => apiClient.getAnnotationImages(split),
  });

  useEffect(() => {
    if (!imagesQuery.data?.images.length) {
      setSelectedImageName("");
      return;
    }

    const selectedStillExists = imagesQuery.data.images.some(
      (image) => image.image_name === selectedImageName,
    );
    if (!selectedImageName || !selectedStillExists) {
      setSelectedImageName(imagesQuery.data.images[0].image_name);
    }
  }, [imagesQuery.data, selectedImageName]);

  const imageDetailQuery = useQuery({
    queryKey: ["annotation-image", split, selectedImageName],
    queryFn: () => apiClient.getAnnotationImage(split, selectedImageName),
    enabled: Boolean(selectedImageName),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedImageName) {
        throw new Error("Select an image first.");
      }
      return apiClient.saveAnnotationImage(split, selectedImageName, { boxes });
    },
    onSuccess: async () => {
      setIsDirty(false);
      await queryClient.invalidateQueries({
        queryKey: ["annotation-images", split],
      });
      await queryClient.invalidateQueries({
        queryKey: ["annotation-image", split, selectedImageName],
      });
      await queryClient.invalidateQueries({ queryKey: ["dataset-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-validation"] });
    },
  });
  const resetSaveMutation = saveMutation.reset;

  useEffect(() => {
    if (!imageDetailQuery.data) {
      return;
    }
    setImageLoaded(false);
    setBoxes(imageDetailQuery.data.boxes);
    setDraftBox(null);
    setIsDirty(false);
    resetSaveMutation();
  }, [imageDetailQuery.data, resetSaveMutation]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Choose a YOLO export archive first.");
      }
      const formData = new FormData();
      formData.append("split", split);
      formData.append("archive", file);
      return apiClient.syncAnnotations(formData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["annotation-images", split],
      });
      await queryClient.invalidateQueries({
        queryKey: ["annotation-image", split, selectedImageName],
      });
      await queryClient.invalidateQueries({ queryKey: ["dataset-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-validation"] });
    },
  });

  const selectedImage = imagesQuery.data?.images.find(
    (image) => image.image_name === selectedImageName,
  );

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Annotation"
        title="Native YOLO box annotator"
        description="Draw ship bounding boxes directly in the workbench. Saving writes YOLO labels straight into the dataset split."
      />

      <section className="card">
        <SectionHeader
          title="Annotator workspace"
          description="Click and drag on the image to create a ship bounding box. Remove boxes from the side panel, then save to write the YOLO label file."
        />

        <div className="annotator-toolbar">
          <label>
            <span>Split</span>
            <select
              value={split}
              onChange={(event) => {
                if (
                  isDirty &&
                  !window.confirm(
                    "Discard unsaved annotation changes for the current image?",
                  )
                ) {
                  return;
                }
                setSplit(event.target.value as SplitName);
              }}
            >
              <option value="train">train</option>
              <option value="valid">valid</option>
              <option value="test">test</option>
            </select>
          </label>
          <label>
            <span>Image</span>
            <select
              value={selectedImageName}
              onChange={(event) => {
                const nextImage = event.target.value;
                if (
                  isDirty &&
                  nextImage !== selectedImageName &&
                  !window.confirm(
                    "Discard unsaved annotation changes for the current image?",
                  )
                ) {
                  return;
                }
                setSelectedImageName(nextImage);
              }}
              disabled={!imagesQuery.data?.images.length}
            >
              {imagesQuery.data?.images.map((image) => (
                <option key={image.image_name} value={image.image_name}>
                  {image.image_name}
                </option>
              ))}
            </select>
          </label>
          <div className="annotator-actions">
            <button
              className="button"
              onClick={() =>
                stepImage(
                  -1,
                  selectedImageName,
                  imagesQuery.data?.images.map((image) => image.image_name) ??
                    [],
                  setSelectedImageName,
                  isDirty,
                )
              }
              disabled={!imagesQuery.data?.images.length}
            >
              Previous
            </button>
            <button
              className="button"
              onClick={() =>
                stepImage(
                  1,
                  selectedImageName,
                  imagesQuery.data?.images.map((image) => image.image_name) ??
                    [],
                  setSelectedImageName,
                  isDirty,
                )
              }
              disabled={!imagesQuery.data?.images.length}
            >
              Next
            </button>
            <button
              className="button"
              onClick={() => {
                setBoxes([]);
                setDraftBox(null);
                setIsDirty(true);
              }}
              disabled={!selectedImageName}
            >
              Clear boxes
            </button>
            <button
              className="button primary"
              onClick={() => saveMutation.mutate()}
              disabled={!selectedImageName || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save labels"}
            </button>
          </div>
        </div>

        <div className="annotator-workbench">
          <div className="annotator-canvas-panel">
            {imageDetailQuery.isLoading ? (
              <div className="empty-state inset">Loading image...</div>
            ) : imageDetailQuery.data ? (
              <>
                <div className="annotator-stage">
                  <img
                    key={imageDetailQuery.data.image_url}
                    className="annotator-image"
                    src={`${appConfig.backendOrigin}${imageDetailQuery.data.image_url}`}
                    alt={imageDetailQuery.data.image_name}
                    draggable={false}
                    onLoad={() => setImageLoaded(true)}
                  />
                  <div
                    className={
                      imageLoaded
                        ? "annotator-overlay"
                        : "annotator-overlay loading"
                    }
                    onPointerDown={(event) => {
                      if (!imageLoaded) {
                        return;
                      }
                      const point = getNormalizedPoint(event);
                      if (!point) {
                        return;
                      }
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraftBox({
                        x1: point.x,
                        y1: point.y,
                        x2: point.x,
                        y2: point.y,
                      });
                    }}
                    onPointerMove={(event) => {
                      if (!imageLoaded) {
                        return;
                      }
                      if (!draftBox) {
                        return;
                      }
                      const point = getNormalizedPoint(event);
                      if (!point) {
                        return;
                      }
                      setDraftBox((current) =>
                        current
                          ? { ...current, x2: point.x, y2: point.y }
                          : current,
                      );
                    }}
                    onPointerUp={(event) => {
                      if (!imageLoaded) {
                        return;
                      }
                      if (!draftBox) {
                        return;
                      }
                      const point = getNormalizedPoint(event);
                      const finalDraft = point
                        ? { ...draftBox, x2: point.x, y2: point.y }
                        : draftBox;
                      const nextBox = draftToBox(finalDraft);
                      if (nextBox) {
                        setBoxes((current) => [...current, nextBox]);
                        setIsDirty(true);
                      }
                      setDraftBox(null);
                    }}
                  >
                    {boxes.map((box, index) => (
                      <div
                        key={`${box.x_center}-${box.y_center}-${index}`}
                        className="annotator-box"
                        style={boxStyle(box)}
                      >
                        <span>{index + 1}</span>
                      </div>
                    ))}
                    {draftBox ? (
                      <div
                        className="annotator-box annotator-box-draft"
                        style={draftStyle(draftBox)}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="annotator-caption">
                  <span className="mono">
                    {imageDetailQuery.data.image_name}
                  </span>
                  <span>{boxes.length} boxes</span>
                  <span>
                    {isDirty ? "Unsaved changes" : "Saved state loaded"}
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-state inset">
                Select an image to annotate.
              </div>
            )}
          </div>

          <aside className="annotator-sidebar-panel">
            <section className="annotator-panel">
              <div className="annotator-panel-header">
                <h3>Image queue</h3>
                <span className="muted small">
                  {imagesQuery.data?.images.length ?? 0} images
                </span>
              </div>
              <div className="annotator-image-list">
                {imagesQuery.data?.images.map((image) => (
                  <button
                    key={image.image_name}
                    className={
                      image.image_name === selectedImageName
                        ? "annotator-image-item active"
                        : "annotator-image-item"
                    }
                    onClick={() => {
                      if (
                        isDirty &&
                        image.image_name !== selectedImageName &&
                        !window.confirm(
                          "Discard unsaved annotation changes for the current image?",
                        )
                      ) {
                        return;
                      }
                      setSelectedImageName(image.image_name);
                    }}
                  >
                    <div>
                      <strong>{truncateImageName(image.image_name)}</strong>
                      <div className="muted small mono">{image.image_name}</div>
                    </div>
                    <span className="annotator-count-pill">
                      {image.box_count}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="annotator-panel">
              <div className="annotator-panel-header">
                <h3>Boxes</h3>
                <span className="muted small">
                  {selectedImage?.has_annotations
                    ? "Existing labels found"
                    : "New / empty label file"}
                </span>
              </div>
              {boxes.length === 0 ? (
                <p className="muted">
                  No boxes drawn yet. Click and drag on the image to add one.
                </p>
              ) : (
                <div className="annotator-box-list">
                  {boxes.map((box, index) => (
                    <div
                      key={`${box.x_center}-${box.y_center}-${index}`}
                      className="annotator-box-row"
                    >
                      <div>
                        <strong>Ship {index + 1}</strong>
                        <div className="muted small mono">{formatBox(box)}</div>
                      </div>
                      <button
                        className="button"
                        onClick={() => {
                          setBoxes((current) =>
                            current.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          );
                          setIsDirty(true);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {imageDetailQuery.data ? (
                <div className="annotator-label-meta">
                  <span className="eyebrow">Label file</span>
                  <span className="mono small">
                    {imageDetailQuery.data.label_path}
                  </span>
                </div>
              ) : null}
              {saveMutation.error ? (
                <p className="warning-line">{saveMutation.error.message}</p>
              ) : null}
              {saveMutation.data ? (
                <div className="success-panel">
                  Saved <strong>{saveMutation.data.saved_count}</strong> boxes
                  to{" "}
                  <span className="mono">{saveMutation.data.label_path}</span>.
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>

      <section className="card">
        <SectionHeader
          title="Bulk import YOLO labels"
          description="Optional: import an existing YOLO label archive if you already have labels from another source."
        />
        <div className="form-grid">
          <label>
            <span>Dataset split</span>
            <select
              value={split}
              onChange={(event) => setSplit(event.target.value as SplitName)}
            >
              <option value="train">train</option>
              <option value="valid">valid</option>
              <option value="test">test</option>
            </select>
          </label>
          <label>
            <span>YOLO label archive</span>
            <input
              type="file"
              accept=".zip"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? "Importing..." : "Import labels"}
          </button>
        </div>
        {syncMutation.error ? (
          <p className="warning-line">{syncMutation.error.message}</p>
        ) : null}
        {syncMutation.data ? (
          <div className="success-panel">
            Imported <strong>{syncMutation.data.synced_count}</strong> labels
            into <span className="mono">{syncMutation.data.destination}</span>.
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getNormalizedPoint(
  event: ReactPointerEvent<HTMLDivElement>,
): { x: number; y: number } | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  return {
    x: Math.min(Math.max(x, 0), 1),
    y: Math.min(Math.max(y, 0), 1),
  };
}

function draftToBox(draft: DraftBox): AnnotationBox | null {
  const left = Math.min(draft.x1, draft.x2);
  const right = Math.max(draft.x1, draft.x2);
  const top = Math.min(draft.y1, draft.y2);
  const bottom = Math.max(draft.y1, draft.y2);
  const width = right - left;
  const height = bottom - top;

  if (width < 0.01 || height < 0.01) {
    return null;
  }

  return {
    class_id: 0,
    x_center: left + width / 2,
    y_center: top + height / 2,
    width,
    height,
  };
}

function boxStyle(box: AnnotationBox) {
  return {
    left: `${(box.x_center - box.width / 2) * 100}%`,
    top: `${(box.y_center - box.height / 2) * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };
}

function draftStyle(draft: DraftBox) {
  const left = Math.min(draft.x1, draft.x2);
  const right = Math.max(draft.x1, draft.x2);
  const top = Math.min(draft.y1, draft.y2);
  const bottom = Math.max(draft.y1, draft.y2);
  return {
    left: `${left * 100}%`,
    top: `${top * 100}%`,
    width: `${(right - left) * 100}%`,
    height: `${(bottom - top) * 100}%`,
  };
}

function formatBox(box: AnnotationBox) {
  return `x ${box.x_center.toFixed(3)} · y ${box.y_center.toFixed(3)} · w ${box.width.toFixed(3)} · h ${box.height.toFixed(3)}`;
}

function truncateImageName(name: string) {
  return name.length > 24 ? `${name.slice(0, 21)}...` : name;
}

function stepImage(
  direction: -1 | 1,
  selectedImageName: string,
  imageNames: string[],
  setSelectedImageName: (value: string) => void,
  isDirty: boolean,
) {
  if (!imageNames.length) {
    return;
  }
  const currentIndex = imageNames.findIndex(
    (name) => name === selectedImageName,
  );
  if (currentIndex === -1) {
    setSelectedImageName(imageNames[0]);
    return;
  }
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= imageNames.length) {
    return;
  }
  if (
    isDirty &&
    !window.confirm("Discard unsaved annotation changes for the current image?")
  ) {
    return;
  }
  setSelectedImageName(imageNames[nextIndex]);
}
