import "./App.css";
import { NavLink, Route, Routes } from "react-router-dom";
import ExportPage from "./ui/pages/ExportPage";
import ImportPage from "./ui/pages/ImportPage";
import LibraryPage from "./ui/pages/LibraryPage";
import ReaderPage from "./ui/pages/ReaderPage";
import SettingsPage from "./ui/pages/SettingsPage";
import ErrorBoundary from "./ui/components/ErrorBoundary";

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Pocket Export</h1>
          <p>Local-first read-it-later MVP shell.</p>
        </div>
        <nav className="app__nav">
          <NavLink to="/" end>
            Library
          </NavLink>
          <NavLink to="/import">Import</NavLink>
          <NavLink to="/export">Export</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="app__main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/reader/:id" element={<ReaderPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
