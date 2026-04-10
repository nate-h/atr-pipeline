import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { SectionHeader } from "../components/SectionHeader";
import { SplitCard } from "../components/SplitCard";

export function DatasetPage() {
  const summaryQuery = useQuery({
    queryKey: ["dataset-summary"],
    queryFn: apiClient.getDatasetSummary,
  });
  const validationQuery = useQuery({
    queryKey: ["dataset-validation"],
    queryFn: apiClient.getDatasetValidation,
  });

  if (summaryQuery.isLoading || validationQuery.isLoading) {
    return <div className="empty-state">Inspecting dataset...</div>;
  }

  if (
    summaryQuery.isError ||
    validationQuery.isError ||
    !summaryQuery.data ||
    !validationQuery.data
  ) {
    return (
      <div className="empty-state">
        Unable to inspect the dataset right now.
      </div>
    );
  }

  const summary = summaryQuery.data;
  const validation = validationQuery.data;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Dataset"
        title="Dataset inspection"
        description="Parsed from the local ships dataset, with validation checks for split integrity and YOLO label coverage."
      />

      <section className="card">
        <div className="two-column">
          <div>
            <h3>Paths</h3>
            <dl className="key-values">
              <div>
                <dt>Dataset root</dt>
                <dd className="mono">{summary.root_path}</dd>
              </div>
              <div>
                <dt>YAML path</dt>
                <dd className="mono">{summary.yaml_path}</dd>
              </div>
              <div>
                <dt>Classes</dt>
                <dd>{summary.classes.join(", ")}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3>Validation warnings</h3>
            {validation.warnings.length === 0 ? (
              <p className="muted">No validation warnings.</p>
            ) : (
              <ul className="plain-list">
                {validation.warnings.map((warning) => (
                  <li key={warning} className="warning-line">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <SectionHeader
          title="Split counts"
          description="Counts reflect actual files on disk in the mounted dataset."
        />
        <div className="grid split-grid">
          {summary.splits.map((split) => (
            <SplitCard key={split.name} split={split} />
          ))}
        </div>
      </section>

      <section className="card">
        <SectionHeader
          title="Parsed YAML"
          description="The backend preserves the original YAML and also rewrites paths internally for local training."
        />
        <div className="two-column">
          <div>
            <h3>Source YAML</h3>
            <pre>{JSON.stringify(summary.parsed_yaml, null, 2)}</pre>
          </div>
          <div>
            <h3>Normalized training YAML</h3>
            <pre>{JSON.stringify(summary.normalized_yaml, null, 2)}</pre>
          </div>
        </div>
      </section>

      <section className="card">
        <SectionHeader
          title="Validation details"
          description="Missing, empty, and orphan label files are surfaced per split."
        />
        <div className="grid split-grid">
          {validation.splits.map((split) => (
            <article key={split.name} className="card inner-card">
              <h3>{split.name}</h3>
              <p className="muted">
                Missing labels: {split.missing_label_files.length}
              </p>
              <p className="muted">
                Empty labels: {split.empty_label_files.length}
              </p>
              <p className="muted">
                Orphan labels: {split.orphan_label_files.length}
              </p>
              <div className="list-block">
                <strong>Examples</strong>
                <ul className="plain-list mono small">
                  {split.empty_label_files.slice(0, 5).map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                  {split.empty_label_files.length === 0 ? (
                    <li>No empty labels.</li>
                  ) : null}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
