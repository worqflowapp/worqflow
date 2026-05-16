import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function App() {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectList);
    };
    fetchProjects();
  }, []);

  const addProject = async () => {
    if (!newProject.trim()) return;
    await addDoc(collection(db, "projects"), {
      name: newProject,
      createdAt: new Date()
    });
    setNewProject("");
    window.location.reload();
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>Worqflow</h1>
      <p style={{ color: "#666", marginBottom: "32px" }}>Your projects</p>
      
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <input
          value={newProject}
          onChange={e => setNewProject(e.target.value)}
          placeholder="New project name..."
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" }}
        />
        <button
          onClick={addProject}
          style={{ padding: "10px 20px", background: "#0A84FF", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer" }}
        >
          Add
        </button>
      </div>

      {projects.map(project => (
        <div key={project.id} style={{ padding: "16px", background: "#f5f5f5", borderRadius: "8px", marginBottom: "8px" }}>
          <p style={{ fontWeight: "600", margin: 0 }}>{project.name}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
