import React from "react";
import { createRoot } from "react-dom/client";
import MinimalShotstackStudio from "./components/MinimalShotstackStudio";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <MinimalShotstackStudio />
        </React.StrictMode>
    );
}
