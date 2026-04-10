export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface SplitSummary {
  name: string;
  image_count: number;
  label_count: number;
  empty_label_count: number;
  missing_label_count: number;
  orphan_label_count: number;
  sample_images: string[];
}

export interface DatasetSummary {
  id: number;
  name: string;
  root_path: string;
  yaml_path: string;
  parsed_yaml: Record<string, unknown>;
  normalized_yaml: Record<string, unknown>;
  classes: string[];
  splits: SplitSummary[];
  last_training_run: DashboardRunSummary | null;
}

export interface SplitValidation {
  name: string;
  missing_label_files: string[];
  orphan_label_files: string[];
  empty_label_files: string[];
  sample_images: string[];
}

export interface DatasetValidation {
  dataset_id: number;
  dataset_name: string;
  classes: string[];
  warnings: string[];
  splits: SplitValidation[];
}

export interface DashboardRunSummary {
  id: string;
  status: RunStatus;
  model_name: string;
  started_at: string | null;
  completed_at: string | null;
  metrics_json: Record<string, unknown> | null;
}

export interface TrainingRunCreatePayload {
  model_name: string;
  epochs: number;
  batch_size: number;
  image_size: number;
}

export interface EvaluationRunSummary {
  id: string;
  training_run_id: string;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  outputs_path: string;
  outputs_url: string | null;
  metrics_json: Record<string, unknown> | null;
  created_at: string;
}

export interface TrainingRunSummary {
  id: string;
  dataset_id: number;
  model_name: string;
  epochs: number;
  batch_size: number;
  image_size: number;
  status: RunStatus;
  started_at: string | null;
  completed_at: string | null;
  artifact_path: string;
  artifact_url: string | null;
  metrics_json: Record<string, unknown> | null;
  mlflow_run_id: string | null;
  mlflow_url: string | null;
  created_at: string;
}

export interface TrainingRunDetail extends TrainingRunSummary {
  logs: string;
  evaluations: EvaluationRunSummary[];
}

export interface EvaluationRunDetail extends EvaluationRunSummary {
  logs: string;
  confusion_matrix_url: string | null;
  normalized_confusion_matrix_url: string | null;
  sample_prediction_urls: string[];
}

export interface AnnotationInfo {
  mode: string;
  dataset_root: string;
  classes: string[];
  instructions: string[];
  sync_support: boolean;
}

export interface AnnotationSyncResponse {
  split: string;
  synced_count: number;
  destination: string;
  skipped_files: string[];
}

export interface AnnotationBox {
  class_id: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

export interface AnnotationImageSummary {
  image_name: string;
  image_url: string;
  has_annotations: boolean;
  box_count: number;
}

export interface AnnotationImageListResponse {
  split: "train" | "valid" | "test";
  images: AnnotationImageSummary[];
}

export interface AnnotationImageDetail {
  split: "train" | "valid" | "test";
  image_name: string;
  image_url: string;
  label_path: string;
  classes: string[];
  boxes: AnnotationBox[];
}

export interface AnnotationSavePayload {
  boxes: AnnotationBox[];
}

export interface AnnotationSaveResponse {
  split: string;
  image_name: string;
  label_path: string;
  saved_count: number;
}
