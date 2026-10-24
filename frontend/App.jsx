
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const examples = [
  {
    label: "Enchanted forest",
    text: "I walked through a magical forest with glowing trees beneath a violet moon.",
  },
  {
    label: "Flying dream",
    text: "I was flying high above the clouds, looking down at a sparkling city.",
  },
  {
    label: "Ocean world",
    text: "I explored an underwater kingdom filled with glowing coral and friendly sea creatures.",
  },
];

function imageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function App() {
  const [dream, setDream] = useState("");
  const [title, setTitle] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [scene, setScene] = useState(null);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function loadJournal() {
    setJournalLoading(true);
    try {
      const response = await fetch(`${API}/api/journal`);
      if (!response.ok) throw new Error("Could not load journal.");
      const data = await response.json();
      setJournal(
        Array.isArray(data.dreams)
          ? data.dreams
          : Array.isArray(data.entries)
          ? data.entries
          : []
      );
    } catch (err) {
      setMessage(err.message);
    } finally {
      setJournalLoading(false);
    }
  }

  useEffect(() => {
    loadJournal();
  }, []);

  async function exploreDream() {
    if (!dream.trim()) {
      setError("Please describe your dream first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setAnalysis(null);
    setScene(null);

    try {
      const [analysisResponse, sceneResponse] = await Promise.all([
        fetch(`${API}/api/analyze-dream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dream: dream.trim() }),
        }),
        fetch(`${API}/api/generate-scene`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dream: dream.trim() }),
        }),
      ]);

      const analysisData = await analysisResponse.json();
      const sceneData = await sceneResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(analysisData.detail || "Dream analysis failed.");
      }
      if (!sceneResponse.ok) {
        throw new Error(sceneData.detail || "Image generation failed.");
      }

      setAnalysis(
        analysisData.analysis ?? analysisData.result ?? analysisData
      );
      setScene(sceneData.scene ?? sceneData.result ?? sceneData);

      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (err) {
      setError(
        `${err.message} Make sure the backend is running at ${API}.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveToJournal() {
    if (!dream.trim()) {
      setMessage("Write a dream before saving it.");
      return;
    }

    try {
      const image =
        scene?.image_url ||
        scene?.imageUrl ||
        scene?.url ||
        "";

      const response = await fetch(`${API}/api/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || dream.trim().slice(0, 45),
          dream: dream.trim(),
          image_url: typeof image === "string" ? image : "",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.detail || "Could not save dream.");
      }

      setMessage("Dream saved successfully!");
      await loadJournal();

      document.getElementById("journal")?.scrollIntoView({
        behavior: "smooth",
      });
    } catch (err) {
      setMessage(`Save failed: ${err.message}`);
    }
  }

  async function deleteDream(id) {
    if (!window.confirm("Delete this dream from your journal?")) return;

    try {
      const response = await fetch(`${API}/api/journal/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.detail || "Could not delete dream.");
      }

      setJournal((items) => items.filter((item) => item.id !== id));
      setMessage("Dream deleted.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function copyDream() {
    try {
      await navigator.clipboard.writeText(dream);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Unable to copy. Please copy the text manually.");
    }
  }

  function reuseDream(entry) {
    setDream(entry.dream || "");
    setTitle(entry.title || "");
    document.getElementById("create")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  function analysisText() {
    if (!analysis) return "";
    if (typeof analysis === "string") return analysis;

    return (
      analysis.interpretation ||
      analysis.meaning ||
      analysis.summary ||
      analysis.analysis ||
      JSON.stringify(analysis, null, 2)
    );
  }

  const generatedImage = imageUrl(
    scene?.image_url ||
      scene?.imageUrl ||
      scene?.url ||
      scene?.image ||
      ""
  );

  return (
    <div className="cosmos">
      <div className="star-field" aria-hidden="true">
        {Array.from({ length: 70 }, (_, i) => (
          <span
            className="star"
            key={i}
            style={{
              "--x": `${(i * 37 + 11) % 100}%`,
              "--y": `${(i * 53 + 7) % 100}%`,
              "--delay": `${-(i % 9) * 0.7}s`,
              "--duration": `${3 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-symbol">✧</span>
          <span>
            DreamWeaver<span className="brand-ai"> AI</span>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#create">Create</a>
          <a href="#journal" onClick={loadJournal}>
            Dream Journal
          </a>
        </nav>

        <button
          className="topbar-cta"
          onClick={() =>
            document.getElementById("create")?.scrollIntoView({
              behavior: "smooth",
            })
          }
        >
          Begin dreaming <span>↗</span>
        </button>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-badge">
            <span className="live-dot" /> YOUR IMAGINATION, REIMAGINED
          </div>

          <h1>
            Where dreams become <span className="gradient-text">worlds.</span>
          </h1>

          <p className="hero-description">
            Turn your dreams into vivid visual worlds. Explore their possible
            meanings and save your memories in your personal dream journal.
          </p>

          <button
            className="hero-button"
            onClick={() =>
              document.getElementById("create")?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            <span>✦</span> Bring a dream to life
            <span className="button-arrow">↓</span>
          </button>

          <div className="hero-caption">
            <span className="caption-line" />
            A LITTLE MAGIC FOR YOUR INNER WORLD
            <span className="caption-line" />
          </div>
        </section>

        <section className="workspace" id="create">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE DREAM STUDIO</span>
              <h2>Let's explore your dream</h2>
              <p>Describe what you remember. Every detail matters.</p>
            </div>
            <div className="step-indicator">
              <span className="step-active">01 Create</span>
              <span className="step-divider" />
              <span>02 Explore</span>
            </div>
          </div>

          <div className="creation-grid">
            <div className="glass-panel dream-card">
              <div className="card-topline">
                <span className="field-label">YOUR DREAM NOTES</span>
                <span className="private-label">✧ A space just for you</span>
              </div>

              <label className="dream-label" htmlFor="dream-title">
                Dream title (optional)
              </label>
              <input
                id="dream-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The city above the clouds"
              />

              <label className="dream-label" htmlFor="dream-text">
                Tell us what happened...
              </label>
              <textarea
                id="dream-text"
                value={dream}
                onChange={(e) => setDream(e.target.value)}
                placeholder="I found myself in a place unlike anywhere I've seen before..."
                maxLength={5000}
              />

              <div className="textarea-footer">
                <span>{dream.length} characters</span>
                <button
                  className="text-action"
                  onClick={() => {
                    setDream("");
                    setTitle("");
                    setError("");
                  }}
                >
                  Clear notes
                </button>
              </div>

              <div className="examples">
                <span className="examples-label">NEED A LITTLE INSPIRATION?</span>
                <div className="example-list">
                  {examples.map((item) => (
                    <button
                      className="example-chip"
                      key={item.label}
                      onClick={() => setDream(item.text)}
                    >
                      <span>✦</span> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="generate-button"
                onClick={exploreDream}
                disabled={loading}
              >
                <span className="generate-icon">
                  {loading ? "◌" : "✧"}
                </span>
                <span>
                  {loading ? "Exploring your dream..." : "Explore my dream"}
                  <small>
                    Generate a scene and discover its possible meaning
                  </small>
                </span>
                <span className="generate-arrow">→</span>
              </button>

              {error && <div className="error-message">{error}</div>}
            </div>

            <aside className="side-panel">
              <div className="side-illustration">
                <span className="planet-star star-a">✦</span>
                <span className="planet-star star-b">✧</span>
                <span className="planet-star star-c">·</span>
                <span className="planet-star star-d">✦</span>
                <div className="planet">
                  <span className="planet-crater crater-one" />
                  <span className="planet-crater crater-two" />
                  <span className="planet-crater crater-three" />
                </div>
                <span className="planet-ring ring-one" />
                <span className="planet-ring ring-two" />
                <span className="planet-label">A UNIVERSE WITHIN YOU</span>
              </div>

              <div className="side-copy">
                <span className="section-kicker">YOUR MIND IS A GALAXY</span>
                <h3>Every dream has a universe.</h3>
                <p>Every dream can hold a story worth exploring.</p>
              </div>

              <div className="feature-row">
                <span>✧</span>
                <div><strong>Visualize</strong><small>Turn words into dreamlike scenes</small></div>
              </div>
              <div className="feature-row">
                <span>☾</span>
                <div><strong>Understand</strong><small>Reflect on symbols and emotions</small></div>
              </div>
              <div className="feature-row">
                <span>♡</span>
                <div><strong>Remember</strong><small>Save your meaningful moments</small></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="results-section" id="results">
          <div className="section-heading">
            <div>
              <span className="section-kicker">BEYOND THE DREAM</span>
              <h2>Your dream, unfolded</h2>
              <p>Your visual interpretation and a moment to reflect.</p>
            </div>
            <div className="results-status">
              <span className={scene ? "live-dot" : ""} />
              {scene ? "DREAM CREATED" : "AWAITING YOUR DREAM"}
            </div>
          </div>

          {!scene && !analysis && !loading && (
            <div className="empty-state glass-panel">
              <span className="empty-state-icon">✧</span>
              <h3>Your next dream adventure starts here</h3>
              <p>Describe a dream above and select Explore my dream.</p>
            </div>
          )}

          {loading && (
            <div className="pending-card glass-panel">
              <span className="generate-icon">✧</span>
              <h3>Gathering stardust...</h3>
              <p>Exploring your dream and preparing the results.</p>
              <div className="progress-area"><span /></div>
            </div>
          )}

          {(scene || analysis) && !loading && (
            <>
              <div className="artwork-card glass-panel">
                <div className="artwork-header">
                  <div>
                    <span className="section-kicker">YOUR DREAMSCAPE</span>
                    <h3>{title || "A world from your dream"}</h3>
                  </div>
                  <span className="private-label">✧ Made from your imagination</span>
                </div>

                <div className="artwork-image-wrap">
                  {generatedImage ? (
                    <img
                      className="artwork-image"
                      src={generatedImage}
                      alt="Generated dream scene"
                    />
                  ) : (
                    <div className="empty-state">
                      <p>
                        {scene?.message ||
                          scene?.description ||
                          "No image URL was returned by the backend."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="artwork-footer">
                  <button className="outline-button" onClick={copyDream}>
                    {copied ? "Copied!" : "Copy dream"}
                  </button>
                  {generatedImage && (
                    <a
                      className="outline-button"
                      href={generatedImage}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      ↓ Save image
                    </a>
                  )}
                  <button className="outline-button" onClick={saveToJournal}>
                    ♡ Save to journal
                  </button>
                </div>
              </div>

              {analysis && (
                <div className="analysis-grid">
                  <article className="insight-card glass-panel">
                    <span className="section-kicker">DREAM REFLECTION</span>
                    <h3>What it might mean</h3>
                    <p>{analysisText()}</p>
                  </article>
                  <article className="story-card glass-panel">
                    <span className="section-kicker">A GENTLE REMINDER</span>
                    <h3>Your dreams are personal.</h3>
                    <p>
                      Interpretations are possibilities, not predictions.
                      Reflect on what feels meaningful to you.
                    </p>
                  </article>
                </div>
              )}
            </>
          )}
        </section>

        <section className="results-section journal-section" id="journal">
          <div className="section-heading">
            <div>
              <span className="section-kicker">YOUR PRIVATE COLLECTION</span>
              <h2>Dream journal</h2>
              <p>Revisit the dreams you have saved.</p>
            </div>
            <button
              className="outline-button"
              onClick={loadJournal}
              disabled={journalLoading}
            >
              {journalLoading ? "Refreshing..." : "↻ Refresh journal"}
            </button>
          </div>

          {message && <p role="status">{message}</p>}

          {journalLoading && (
            <div className="empty-state glass-panel">Loading journal...</div>
          )}

          {!journalLoading && journal.length === 0 && (
            <div className="empty-state glass-panel">
              <span className="empty-state-icon">☾</span>
              <h3>Your journal is waiting</h3>
              <p>Save a dream to see it here.</p>
            </div>
          )}

          {!journalLoading && journal.length > 0 && (
            <div className="journal-grid">
              {journal.map((entry) => (
                <article className="journal-card glass-panel" key={entry.id}>
                  {entry.image_url && (
                    <img
                      className="journal-image"
                      src={imageUrl(entry.image_url)}
                      alt=""
                    />
                  )}
                  <div className="journal-card-content">
                    <span className="section-kicker">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleString()
                        : "SAVED DREAM"}
                    </span>
                    <h3>{entry.title || "Untitled dream"}</h3>
                    <p>{entry.dream}</p>
                    <div className="journal-actions">
                      <button
                        className="outline-button"
                        onClick={() => reuseDream(entry)}
                      >
                        ↺ Revisit
                      </button>
                      <button
                        className="outline-button"
                        onClick={() => deleteDream(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="closing-banner">
          <span>✧</span>
          <h2>Keep a little wonder with you.</h2>
          <p>Your dream world is always waiting to be explored.</p>
          <button
            className="hero-button"
            onClick={() =>
              document.getElementById("create")?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            Create another dream
          </button>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-symbol">✧</span>
          <span>DreamWeaver<span className="brand-ai"> AI</span></span>
        </a>
        <span>Made for the worlds we carry within.</span>
        <span>✦ DREAM · REFLECT · REMEMBER</span>
      </footer>
    </div>
  );
}
