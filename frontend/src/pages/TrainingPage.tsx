import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import type { TrainingRunCreatePayload } from "../types/api";

const initialPayload: TrainingRunCreatePayload = {
  model_name: "yolov8n.pt",
  epochs: 5,
  batch_size: 8,
  image_size: 640,
};

export function TrainingPage() {
  const queryClient = useQueryClient();
  const [payload, setPayload] =
    useState<TrainingRunCreatePayload>(initialPayload);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ["training-runs"],
    queryFn: apiClient.getTrainingRuns,
    refetchInterval: (query) => {
      const runs = query.state.data ?? [];
      return runs.some(
        (run) => run.status === "queued" || run.status === "running",
      )
        ? 5000
        : false;
    },
  });

  const activeRunId = selectedRunId ?? runsQuery.data?.[0]?.id ?? null;

  const runDetailQuery = useQuery({
    queryKey: ["training-run", activeRunId],
    queryFn: () => apiClient.getTrainingRun(activeRunId!),
    enabled: Boolean(activeRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 5000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: apiClient.startTrainingRun,
    onSuccess: async (run) => {
      setSelectedRunId(run.id);
      await queryClient.invalidateQueries({ queryKey: ["training-runs"] });
      await queryClient.invalidateQueries({ queryKey: ["dataset-summary"] });
    },
  });

  const currentRun = runDetailQuery.data;
  const runOptions = runsQuery.data ?? [];
  const numericMetrics = currentRun?.metrics_json
    ? ["precision", "recall", "map50", "map50_95"]
        .map((key) => ({
          key,
          value: currentRun.metrics_json?.[key],
        }))
        .filter((item) => typeof item.value === "number")
    : [];

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Training"
        title="Launch a YOLOv8 training run"
        description="Runs start in the background, log into MLflow when available, and write artifacts to a predictable local folder."
      />

      <section className="card">
        <div className="form-grid three-up">
          <label>
            <span>Model checkpoint</span>
            <input
              value={payload.model_name}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  model_name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Epochs</span>
            <input
              type="number"
              min={1}
              value={payload.epochs}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  epochs: Number(event.target.value) || 1,
                }))
              }
            />
          </label>
          <label>
            <span>Batch size</span>
            <input
              type="number"
              min={1}
              value={payload.batch_size}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  batch_size: Number(event.target.value) || 1,
                }))
              }
            />
          </label>
          <label>
            <span>Image size</span>
            <input
              type="number"
              min={64}
              value={payload.image_size}
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  image_size: Number(event.target.value) || 640,
                }))
              }
            />
          </label>
        </div>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => createMutation.mutate(payload)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Starting..." : "Start training"}
          </button>
        </div>
        {createMutation.error ? (
          <p className="warning-line">{createMutation.error.message}</p>
        ) : null}
      </section>

      <section className="card">
        <SectionHeader
          title="Run detail"
          description="Select a run to watch status, logs, metrics, and saved artifact paths."
          actions={
            <select
              value={activeRunId ?? ""}
              onChange={(event) => setSelectedRunId(event.target.value)}
            >
              {runOptions.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id.slice(0, 8)} · {run.model_name} · {run.status}
                </option>
              ))}
            </select>
          }
        />

        {!currentRun ? (
          <div className="empty-state inset">
            Start a training run to view details here.
          </div>
        ) : (
          <div className="two-column">
            <div className="stacked">
              <div className="inline-header">
                <h3 className="mono">{currentRun.id}</h3>
                <StatusBadge status={currentRun.status} />
              </div>
              <dl className="key-values">
                <div>
                  <dt>Artifact path</dt>
                  <dd className="mono">{currentRun.artifact_path}</dd>
                </div>
                <div>
                  <dt>MLflow</dt>
                  <dd>
                    {currentRun.mlflow_url
                      ? currentRun.mlflow_url
                      : "Not linked"}
                  </dd>
                </div>
                <div>
                  <dt>Params</dt>
                  <dd>
                    {currentRun.model_name} · {currentRun.epochs} epochs · batch{" "}
                    {currentRun.batch_size} · imgsz {currentRun.image_size}
                  </dd>
                </div>
              </dl>
              <div className="metric-row">
                {numericMetrics.length > 0 ? (
                  numericMetrics.map((metric) => (
                    <div key={metric.key} className="metric-pill">
                      <span>{metric.key}</span>
                      <strong>{Number(metric.value).toFixed(3)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Metrics will appear after the run completes.
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3>Logs</h3>
              <pre>
                {currentRun.logs ||
                  "Logs will stream here once the worker starts writing."}
              </pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
