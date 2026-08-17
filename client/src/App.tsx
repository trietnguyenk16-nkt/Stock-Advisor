import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import History from "./pages/History";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/"><Home /></Route>
      <Route path="/history"><History /></Route>
      <Route path="/404"><NotFound /></Route>
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      {!import.meta.env.DEV && <PwaInstallPrompt />}
      <Router />
    </ErrorBoundary>
  );
}

export default App;

if (typeof window !== "undefined" && "serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] Service worker registration failed", error);
    });
  });
}
