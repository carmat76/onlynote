import { useRef, useEffect, useState } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";

function App() {
  const canvasRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 180); // leave room for buttons

  useEffect(() => {
    const handleResize = () => {
      setCanvasHeight(window.innerHeight - 180);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canvasStyles = {
    border: "1px solid #000",
    width: "100%",
    height: `${canvasHeight}px`,
    touchAction: "none",
  };

  const handleSave = async () => {
    const paths = await canvasRef.current.exportPaths();
    localStorage.setItem("drawing", JSON.stringify(paths));
    alert("Drawing saved to localStorage");
  };

  const handleClear = () => {
    canvasRef.current.clearCanvas();
    localStorage.removeItem("drawing");
  };

  const handleUndo = () => {
    canvasRef.current.undo();
  };

  const handleExportJSON = async () => {
    const paths = await canvasRef.current.exportPaths();
    const blob = new Blob([JSON.stringify(paths)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drawing.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadJSON = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const data = JSON.parse(fileReader.result);
      canvasRef.current.loadPaths(data);
    };
    fileReader.readAsText(e.target.files[0]);
  };

  const handleSavePNG = async () => {
    const imageData = await canvasRef.current.exportImage("png");
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "drawing.png";
    link.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", margin: 0 }}>
      <div style={{ flex: 1 }}>
        <ReactSketchCanvas
          ref={canvasRef}
          style={canvasStyles}
          strokeWidth={4}
          strokeColor="black"
          canvasColor="white"
          withTimestamp={false}
          allowOnlyPointerType="all"
        />
      </div>
      <div style={{ padding: 10, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleExportJSON}>Export JSON</button>
        <label>
          <input
            type="file"
            accept="application/json"
            onChange={handleLoadJSON}
            style={{ display: "none" }}
          />
          <button>Load JSON</button>
        </label>
        <button onClick={handleSavePNG}>Save PNG</button>
      </div>
    </div>
  );
}

export default App;
