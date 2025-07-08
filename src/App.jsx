import { useRef, useEffect, useState } from "react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import { supabase } from "./supabaseClient";

function App() {
  const canvasRef = useRef(null);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 180);
  const [strokes, setStrokes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // 'writer' or 'reader'

  const [shareEmail, setShareEmail] = useState("");
const [shareStatus, setShareStatus] = useState("");

// Send note to another user
const handleShare = async (role = "reader") => {
  setShareStatus("Sharing...");

  if (!user || !shareEmail) {
    setShareStatus("Missing user or email");
    return;
  }

  // 1. Look up the target user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", shareEmail.toLowerCase())
    .single();

  if (profileError || !profile) {
    setShareStatus("User not found");
    return;
  }

  const targetId = profile.id;

  // 2. Get current user's note ID
  const { data: noteData, error: noteError } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (noteError || !noteData) {
    setShareStatus("No note found to share");
    return;
  }

  const { error: shareError } = await supabase
    .from("note_shares")
    .upsert({
      note_id: noteData.id,
      shared_with: targetId,
      role,
    });

  if (shareError) {
    console.error(shareError);
    setShareStatus("Failed to share");
  } else {
    setShareStatus(`Shared as ${role}`);
  }
};

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

  // Load from Supabase (own note or shared)
  useEffect(() => {
    const loadNote = async () => {
      if (!user) return;

      const { data: ownNote, error: ownError } = await supabase
        .from("notes")
        .select("content")
        .eq("user_id", user.id)
        .single();

      if (ownNote) {
        try {
          setStrokes(JSON.parse(ownNote.content));
          setRole("writer");
        } catch (err) {
          console.error("Error parsing writer note:", err);
        }
        return;
      }

      const { data: sharedNote, error: sharedError } = await supabase
        .from("note_shares")
        .select("role, notes(content)")
        .eq("shared_with", user.id)
        .maybeSingle();

      if (sharedNote?.notes?.content) {
        try {
          setStrokes(JSON.parse(sharedNote.notes.content));
          setRole(sharedNote.role);
        } catch (err) {
          console.error("Error parsing shared note:", err);
        }
      } else {
        console.warn("No note available for this user.");
        setRole(null);
      }
    };

    loadNote();
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
    if (role !== "writer") {
      alert("Only the writer can save this note.");
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
        { onConflict: "user_id" }
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
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) console.error("Login failed:", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ height: "100vh", width: "100vw", margin: 0, padding: 0, overflow: "hidden", position: "relative" }}>
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
              <span>Welcome, {user.email} {role && `(${role})`}</span>
              <button onClick={handleLogout} style={{ marginLeft: 10 }}>Sign out</button>
            </>
          ) : (
            <button onClick={handleGoogleLogin}>Sign in with Google</button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ height: "100%", paddingTop: 10, paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
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
<div style={{ padding: 20 }}>
  <h4>Share Note</h4>
  <input
    type="email"
    placeholder="Enter email to share with"
    value={shareEmail}
    onChange={(e) => setShareEmail(e.target.value)}
    style={{ padding: "8px", width: "250px", marginRight: "10px" }}
  />
  <button onClick={() => handleShare("reader")}>Share as Reader</button>
  <button onClick={() => handleShare("writer")}>Share as Writer</button>
  <div>{shareStatus}</div>
</div>

      {/* Bottom Tools */}
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
        <button onClick={handleLocalSave}>Save Local</button>
        <button onClick={handleSaveToCloud}>Save to Cloud</button>
        <button onClick={handleSavePNG}>Save PNG</button>
      </div>
    </div>
    
  );
}

export default App;
