import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LegacyHome from "./pages/LegacyHome";
import ChartsListPage from "./pages/ChartsListPage";
import ChartPage from "./pages/ChartPage";

export default function App() {
  return (
    <BrowserRouter basename="/KaravaliBazar">
      <Routes>
        <Route path="/" element={<LegacyHome />} />
        <Route path="/charts" element={<ChartsListPage />} />
        <Route path="/game/:id/chart" element={<ChartPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/funds" element={<Navigate to="/" replace />} />
        <Route path="/my-bids" element={<Navigate to="/" replace />} />
        <Route path="/passbook" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<Navigate to="/" replace />} />
        <Route path="/game/:id/play" element={<Navigate to="/" replace />} />
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
