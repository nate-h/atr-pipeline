import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { appConfig } from "../lib/config";

export function EvaluationPage() {
  const queryClient = useQueryClient();
  const [selectedTrainingRunId, setSelectedTrainingRunId] =
    useState<string>("");
  const [selectedEvaluationRunId, setSelectedEvaluationRunId] =
    useState<string>("");

  const trainingRunsQuery = useQuery({
    queryKey: ["training-runs"],
    queryFn: apiClient.getTrainingRuns,
  });

  const evaluationRunsQuery = useQuery({
    queryKey: ["evaluation-runs"],
    queryFn: apiClient.getEvaluationRuns,
    refetchInterval: (query) => {
      const runs = query.state.data ?? [];
      return runs.some(
        (run) => run.status === "queued" || run.status === "running",
      )
        ? 5000
        : false;
    },
  });

  useEffect(() => {
    if (!selectedTrainingRunId && trainingRunsQuery.data?.[0]) {
      setSelectedTrainingRunId(trainingRunsQuery.data[0].id);
    }
  }, [selectedTrainingRunId, trainingRunsQuery.data]);

  useEffect(() => {
    if (!selectedEvaluationRunId && evaluationRunsQuery.data?.[0]) {
      setSelectedEvaluationRunId(evaluationRunsQuery.data[0].id);
    }
  }, [selectedEvaluationRunId, evaluationRunsQuery.data]);

  const evaluationDetailQuery = useQuery({
    queryKey: ["evaluation-run", selectedEvaluationRunId],
    queryFn: () => apiClient.getEvaluationRun(selectedEvaluationRunId),
    enabled: Boolean(selectedEvaluationRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 5000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: apiClient.startEvaluationRun,
    onSuccess: async (run) => {
      setSelectedEvaluationRunId(run.id);
      await queryClient.invalidateQueries({ queryKey: ["evaluation-runs"] });
    },
  });

  const detail = evaluationDetailQuery.data;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Evaluation"
        title="Evaluate a trained model on the test split"
        description="Validation metrics, confusion-matrix artifacts, and a few saved predictions are surfaced here."
      />

      <section className="card">
        <div className="form-grid two-up">
          <label>
            <span>Training run</span>
            <select
              value={selectedTrainingRunId}
              onChange={(event) => setSelectedTrainingRunId(event.target.value)}
            >
              {trainingRunsQuery.data?.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id.slice(0, 8)} · {run.model_name} · {run.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Evaluation run</span>
            <select
              value={selectedEvaluationRunId}
              onChange={(event) =>
                setSelectedEvaluationRunId(event.target.value)
              }
            >
              {evaluationRunsQuery.data?.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id.slice(0, 8)} · {run.status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => createMutation.mutate(selectedTrainingRunId)}
            disabled={!selectedTrainingRunId || createMutation.isPending}
          >
            {createMutation.isPending ? "Starting..." : "Run evaluation"}
          </button>
        </div>
      </section>

      <section className="card">
        {!detail ? (
          <div className="empty-state inset">
            Start or select an evaluation run to inspect results.
          </div>
        ) : (
          <div className="page-stack">
            <div className="inline-header">
              <h3 className="mono">{detail.id}</h3>
              <StatusBadge status={detail.status} />
            </div>
            <div className="metric-row">
              <div className="metric-pill">
                <span>Precision</span>
                <strong>{formatMetric(detail.metrics_json?.precision)}</strong>
              </div>
              <div className="metric-pill">
                <span>Recall</span>
                <strong>{formatMetric(detail.metrics_json?.recall)}</strong>
              </div>
              <div className="metric-pill">
                <span>mAP50</span>
                <strong>{formatMetric(detail.metrics_json?.map50)}</strong>
              </div>
              <div className="metric-pill">
                <span>mAP50-95</span>
                <strong>{formatMetric(detail.metrics_json?.map50_95)}</strong>
              </div>
            </div>

            <div className="two-column">
              <div>
                <h3>Artifacts</h3>
                <dl className="key-values">
                  <div>
                    <dt>Outputs</dt>
                    <dd className="mono">{detail.outputs_path}</dd>
                  </div>
                  <div>
                    <dt>Confusion matrix</dt>
                    <dd>
                      {detail.confusion_matrix_url ? (
                        <a
                          href={`${appConfig.backendOrigin}${detail.confusion_matrix_url}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open image
                        </a>
                      ) : (
                        "Not generated"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3>Logs</h3>
                <pre>{detail.logs || "Evaluation logs will appear here."}</pre>
              </div>
            </div>

            <div>
              <h3>Sample predictions</h3>
              {detail.sample_prediction_urls.length === 0 ? (
                <p className="muted">
                  Predictions will appear here once evaluation finishes.
                </p>
              ) : (
                <div className="prediction-grid">
                  {detail.sample_prediction_urls.map((url) => (
                    <a
                      key={url}
                      href={`${appConfig.backendOrigin}${url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={`${appConfig.backendOrigin}${url}`}
                        alt="Prediction sample"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatMetric(value: unknown) {
  return typeof value === "number" ? value.toFixed(3) : "n/a";
}
