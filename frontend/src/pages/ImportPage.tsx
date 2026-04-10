import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";

type SplitName = "train" | "valid" | "test";

const splitNames: SplitName[] = ["train", "valid", "test"];
const directoryPickerProps = {
  directory: "",
  webkitdirectory: "",
};

export function ImportPage() {
  const queryClient = useQueryClient();
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (archiveFile) {
        formData.append("archive", archiveFile);
      }
      for (const file of folderFiles) {
        formData.append("files", file, file.webkitRelativePath || file.name);
      }
      return apiClient.importDatasetImages(formData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dataset-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-validation"] });
      for (const split of splitNames) {
        await queryClient.invalidateQueries({
          queryKey: ["annotation-images", split],
        });
      }
    },
  });

  const selectedCount = folderFiles.length + (archiveFile ? 1 : 0);
  const canImport = selectedCount > 0 && !importMutation.isPending;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Import"
        title="Add images to the dataset"
        description="Upload a zip or image folder. Files are assigned to train, valid, or test with a stable hash split: 70%, 15%, 15%."
      />

      <section className="card">
        <SectionHeader
          title="How the split works"
          description="Each image is hashed from its file bytes, then placed into one of the dataset folders: train for the first 70%, valid for the next 15%, and test for the final 15%. Empty YOLO label files are created so the images appear in the annotator, but boxes still need to be drawn or imported separately."
        />

        <div className="form-grid two-up">
          <label>
            <span>Zip archive</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) =>
                setArchiveFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label>
            <span>Image folder</span>
            <input
              type="file"
              accept="image/*"
              multiple
              {...directoryPickerProps}
              onChange={(event) =>
                setFolderFiles(Array.from(event.target.files ?? []))
              }
            />
          </label>
        </div>

        <div className="button-row">
          <button
            className="button primary"
            disabled={!canImport}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending ? "Importing..." : "Import images"}
          </button>
          <span className="muted">
            {selectedCount === 0
              ? "Choose a zip or folder."
              : `${selectedCount} upload source${selectedCount === 1 ? "" : "s"} selected.`}
          </span>
        </div>

        {importMutation.error ? (
          <p className="warning-line">{importMutation.error.message}</p>
        ) : null}
      </section>

      {importMutation.data ? (
        <section className="card">
          <SectionHeader
            title="Import results"
            description="Empty YOLO label files were created for imported images so they are visible in the annotator."
          />
          <div className="metric-row">
            <div className="metric-pill">
              <span>Imported</span>
              <strong>{importMutation.data.imported_count}</strong>
            </div>
            <div className="metric-pill">
              <span>Skipped</span>
              <strong>{importMutation.data.skipped_count}</strong>
            </div>
            {splitNames.map((split) => (
              <div key={split} className="metric-pill">
                <span>{split}</span>
                <strong>{importMutation.data.split_counts[split]}</strong>
              </div>
            ))}
          </div>

          {importMutation.data.imported_images.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Original</th>
                    <th>Split</th>
                    <th>Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {importMutation.data.imported_images
                    .slice(0, 25)
                    .map((image) => (
                      <tr key={`${image.split}-${image.saved_name}`}>
                        <td className="mono small">{image.original_name}</td>
                        <td>{image.split}</td>
                        <td className="mono small">{image.saved_name}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {importMutation.data.skipped_files.length > 0 ? (
            <div className="list-block">
              <strong>Skipped files</strong>
              <ul className="plain-list mono small">
                {importMutation.data.skipped_files.slice(0, 25).map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
