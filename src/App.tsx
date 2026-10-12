import { useEffect, useState } from "react";
import { SurveyPage } from "./app/SurveyPage";
import { TermsPoliciesPage } from "./app/TermsPoliciesPage";
import "./App.css";
import { AdminApp } from "./admin/AdminApp";

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminApp pathname={pathname} />;
  }

  if (pathname === "/termos-e-politicas") {
    return <TermsPoliciesPage />;
  }

  return <SurveyPage />;
}

export default App;
