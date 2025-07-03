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

  // Load saved drawing from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("drawing");
    if (saved) {
      setStrokes(JSON.parse(saved));
    }
  }, []);

  // Load from Supabase when user logs in
  useEffect(() => {
    const loadCloudNote = async () => {
      if (!user) return;

      // 1. Try to get user's own note
      const { data: ownNote, error: ownError } = await supabase
        .from("notes")
        .select("content")
        .eq("user_id", user.id)
        .single();

      if (ownNote) {
        try {
          setStrokes(JSON.parse(ownNote.content));
        } catch (err) {
          console.error("Failed to parse own note content", err);
        }
        return;
      }

      // 2. If no own note, check if any are shared with this user
      const { data: sharedNotes, error: sharedError } = await supabase
        .from("note_shares")
        .select("notes(content)")
        .eq("shared_with", user.id)
        .maybeSingle();

      if (sharedError || !sharedNotes || !sharedNotes.notes) {
        console.warn("No note found (own or shared).", sharedError?.message);
        return;
      }

      try {
        setStrokes(JSON.parse(sharedNotes.notes.content));
      } catch (err) {
        console.error("Failed to parse shared note content", err);
      }
    };

    loadCloudNote();
  }, [user]);


  // Apply strokes to canvas
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

  // Save to localStorage
  const handleLocalSave = async () => {
    const paths = await canvasRef.current.exportPaths();
    localStorage.setItem("drawing", JSON.stringify(paths));
    alert("Drawing saved to localStorage");
  };

  // Save to Supabase
  const handleSaveToCloud = async () => {
  if (!user) {
    alert("You must be logged in to save.");
    return;
  }

  const paths = await canvasRef.current.exportPaths();

  const { error } = await supabase
    .from("notes")
    .upsert(
      {
        user_id: user.id,
        content: JSON.stringify(paths),
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id", // <--- Add this!
      }
    );

  if (error) {
    console.error("Supabase error:", error);
    alert("Failed to save to Supabase.");
  } else {
    alert("Drawing saved to Supabase!");
  }
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
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          zIndex: 1000,
        }}
      >
        <div>
          {loading ? (
            <span>Loading...</span>
          ) : user ? (
            <>
              <span>Welcome, {user.email}</span>
              <button onClick={handleLogout} style={{ marginLeft: 10 }}>
                Sign out
              </button>
            </>
          ) : (
            <button onClick={handleGoogleLogin}>Sign in with Google</button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        style={{
          height: "100%",
          paddingTop: 10,
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
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

      {/* Bottom Tools */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          padding:
            "10px env(safe-area-inset-left) calc(10px + env(safe-area-inset-bottom)) env(safe-area-inset-right)",
          display: "flex",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
          zIndex: 1000,
        }}
      >
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleLocalSave}>Save Local</button>
        <button onClick={handleSaveToCloud}>Save to Cloud</button>
        <button onClick={handleSavePNG}>Save PNG</button>
      </div>
    </div>
  );
}

export default App;
