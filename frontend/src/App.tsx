import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { UploadProvider } from "./context/UploadContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { Loader2 } from "lucide-react";
import { LocaleProvider } from "./context/LocaleProvider";

const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Editor = lazy(() =>
  import("./pages/Editor").then((m) => ({ default: m.Editor })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Settings })),
);
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
  </div>
);

function App() {
  return (
    <Router>
      <PreferencesProvider>
        <LocaleProvider>
          <ThemeProvider>
            <UploadProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/collections" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/editor/:id" element={<Editor />} />
                  <Route path="/shared/:id" element={<Editor />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </UploadProvider>
          </ThemeProvider>
        </LocaleProvider>
      </PreferencesProvider>
    </Router>
  );
}

export default App;
