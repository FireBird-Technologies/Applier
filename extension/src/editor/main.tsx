import React from "react";
import { createRoot } from "react-dom/client";
import "../sidepanel/index.css";
import { EditorPage } from "./EditorPage";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorPage />
  </React.StrictMode>,
);
