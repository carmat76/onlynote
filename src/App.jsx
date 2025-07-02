
import { ReactSketchCanvas } from "react-sketch-canvas";
import React, { useRef, useState, useEffect } from "react";

const canvasStyle = {
  border: "1px solid #000",
  borderRadius: "4px",
  width: "100%",
  height: "90vh",
};


function App() {
  const canvasRef = useRef(); // 👈 Move this ABOVE useEffect
  const [savedJson, setSavedJson] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("onlynote_drawing");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedJson(parsed);
      if (canvasRef.current) {
        canvasRef.current.loadPaths(parsed);
      }
    }
  }, []);


  const handleClear = () => {
    canvasRef.current.clearCanvas(); // 👈 Calls the clear method on the canvas
  };

  const handleUndo = () => {
    canvasRef.current.undo(); // 👈 Calls the undo method
  };



const handleLoadJson = async () => {
  if (savedJson) {
    await canvasRef.current.loadPaths(savedJson);
  }
};

const handleExportJson = async () => {
  const json = await canvasRef.current.exportPaths();
  console.log("Exported JSON:", json);
  setSavedJson(json);
  localStorage.setItem("onlynote_drawing", JSON.stringify(json)); // 👈 Save to localStorage
};

  const handleSave = () => {
  if (!canvasRef.current) return;
  const canvas = canvasRef.current.canvasContainer?.children[0];
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'drawing.png';
  link.click();
};

  return (
    <div style={{ padding: "1rem", backgroundColor: "#fff" }}>
      <ReactSketchCanvas
        ref={canvasRef} // 👈 Attach the ref to the canvas
        style={canvasStyle}
        strokeColor="black"
        strokeWidth={3}
      />

<div style={{ marginTop: "1rem" }}>
  <button onClick={handleClear}>Clear</button>
  <button onClick={handleUndo} style={{ marginLeft: "1rem" }}>Undo</button>
  <button onClick={handleSave} style={{ marginLeft: "1rem" }}>Save</button>
  <button onClick={handleExportJson} style={{ marginLeft: "1rem" }}>Export JSON</button>
  <button onClick={handleLoadJson} style={{ marginLeft: "1rem" }}>Load JSON</button>
</div>


    </div>
    
  );
}

export default App;
