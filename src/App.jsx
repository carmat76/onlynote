import { useRef, useEffect, useState } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { supabase } from "./supabaseClient";

function App() {
  const canvasRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 180);
  const [strokes, setStrokes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth setup
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // Canvas resizing
  useEffect(() => {
    const handleResize = () => {
      setCanvasHeight(window.innerHeight - 180);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load saved drawing
  useEffect(() => {
    const saved = localStorage.getItem("drawing");
    if (saved) {
      setStrokes(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (strokes.length && canvasRef.current) {
      canvasRef.current.loadPaths(strokes);
    }
  }, [strokes]);

  const canvasStyles = {
    border: "1px solid #000",
    width: "100vw",
    height: `${canvasHeight}px`,
    touchAction: "none",
  };

  // Button handlers
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

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Login failed:", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
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

      <div style={{ textAlign: "center", marginTop: 10 }}>
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <>
            <p>Welcome, {user.email}</p>
            <button onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <button onClick={handleGoogleLogin}>Sign in with Google</button>
        )}
      </div>

      <div
        style={{
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
          zIndex: 1000,
        }}
      >
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleSavePNG}>Save PNG</button>
      </div>
    </div>
  );
}

export default App;
