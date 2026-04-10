import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnnotationPage } from "./pages/AnnotationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DatasetPage } from "./pages/DatasetPage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { RunsPage } from "./pages/RunsPage";
import { TrainingPage } from "./pages/TrainingPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dataset" element={<DatasetPage />} />
        <Route path="/annotation" element={<AnnotationPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
