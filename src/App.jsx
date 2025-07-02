import { useRef, useEffect, useState } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";

function App() {
  const canvasRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 180);
  const [strokes, setStrokes] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setCanvasHeight(window.innerHeight - 180);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("drawing");
    if (saved) {
      const paths = JSON.parse(saved);
      setStrokes(paths);
    }
  }, []);

  useEffect(() => {
    if (strokes.length && canvasRef.current) {
      canvasRef.current.loadPaths(strokes);
    }
  }, [strokes]);

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
    setStrokes([]);
  };

  const handleUndo = () => {
    canvasRef.current.undo();
  };

  const handleSavePNG = async () => {
    const imageData = await canvasRef.current.exportImage("png");
    const link = document.createElement("a");
    link.href = imageData;
    link.download = "drawing.png";
    link.click();
  };

  return (
    <div style={{ height: "100vh", margin: 0, padding: 0, overflow: "hidden", position: "relative" }}>
      <div style={{ height: "100%", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
        <ReactSketchCanvas
          ref={canvasRef}
          style={canvasStyles}
          strokeWidth={4}
          strokeColor="black"
          canvasColor="white"
          withTimestamp={false}
          allowOnlyPointerType="all"
          onStroke={() => {
            canvasRef.current.exportPaths().then((paths) => {
              localStorage.setItem("drawing", JSON.stringify(paths));
            });
          }}
        />
      </div>

      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        padding: "10px env(safe-area-inset-left) calc(10px + env(safe-area-inset-bottom)) env(safe-area-inset-right)",
        display: "flex",
        justifyContent: "center",
        gap: 8,
        boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
        zIndex: 1000
      }}>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleSavePNG}>Save PNG</button>
      </div>
    </div>
  );
}

export default App;
