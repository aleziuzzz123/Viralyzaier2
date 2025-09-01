import React from "react";
import { createRoot } from "react-dom/client";
import WorkingShotstackStudio from "./components/WorkingShotstackStudio";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <WorkingShotstackStudio />
        </React.StrictMode>
    );
}
