import { appConfig } from "../lib/config";
import type {
  AnnotationImageDetail,
  AnnotationImageListResponse,
  AnnotationInfo,
  AnnotationSavePayload,
  AnnotationSaveResponse,
  AnnotationSyncResponse,
  DatasetImageImportResponse,
  DatasetSummary,
  DatasetValidation,
  EvaluationRunDetail,
  EvaluationRunSummary,
  TrainingRunCreatePayload,
  TrainingRunDetail,
  TrainingRunSummary,
} from "../types/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export const apiClient = {
  getDatasetSummary: () => apiFetch<DatasetSummary>("/dataset/summary"),
  getDatasetValidation: () => apiFetch<DatasetValidation>("/dataset/validate"),
  importDatasetImages: (formData: FormData) =>
    apiFetch<DatasetImageImportResponse>("/dataset/import-images", {
      method: "POST",
      body: formData,
    }),
  getAnnotationInfo: () => apiFetch<AnnotationInfo>("/annotation/info"),
  getAnnotationImages: (split: "train" | "valid" | "test") =>
    apiFetch<AnnotationImageListResponse>(`/annotation/images?split=${split}`),
  getAnnotationImage: (split: "train" | "valid" | "test", imageName: string) =>
    apiFetch<AnnotationImageDetail>(
      `/annotation/images/${split}/${encodeURIComponent(imageName)}`,
    ),
  saveAnnotationImage: (
    split: "train" | "valid" | "test",
    imageName: string,
    payload: AnnotationSavePayload,
  ) =>
    apiFetch<AnnotationSaveResponse>(
      `/annotation/images/${split}/${encodeURIComponent(imageName)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  syncAnnotations: (formData: FormData) =>
    apiFetch<AnnotationSyncResponse>("/annotation/sync", {
      method: "POST",
      body: formData,
    }),
  getTrainingRuns: () => apiFetch<TrainingRunSummary[]>("/training/runs"),
  getTrainingRun: (runId: string) =>
    apiFetch<TrainingRunDetail>(`/training/runs/${runId}`),
  startTrainingRun: (payload: TrainingRunCreatePayload) =>
    apiFetch<TrainingRunSummary>("/training/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getEvaluationRuns: () => apiFetch<EvaluationRunSummary[]>("/evaluation/runs"),
  getEvaluationRun: (runId: string) =>
    apiFetch<EvaluationRunDetail>(`/evaluation/runs/${runId}`),
  startEvaluationRun: (trainingRunId: string) =>
    apiFetch<EvaluationRunSummary>(`/evaluation/runs/${trainingRunId}`, {
      method: "POST",
    }),
};
