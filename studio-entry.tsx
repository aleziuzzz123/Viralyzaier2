import React from "react";
import { createRoot } from "react-dom/client";
import FinalShotstackStudio from "./components/FinalShotstackStudio";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <FinalShotstackStudio />
        </React.StrictMode>
    );
}
