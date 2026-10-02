package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/handlers"
	"ai-toolbox/internal/jobs"
	"ai-toolbox/internal/middleware"
	"ai-toolbox/internal/storage"
	"ai-toolbox/internal/workers"
)

func main() {
	cfg := config.Load()

	log.Printf("==================================================")
	log.Printf("  Anonymous Self-Hosted AI Toolbox Suite")
	log.Printf("  Port: %s | MOCK_AI: %t | Max Jobs: %d", cfg.Port, cfg.MockAI, cfg.MaxConcurrentJobs)
	log.Printf("==================================================")

	// Initialize Storage
	storeStorage, err := storage.New(cfg.StoragePath)
	if err != nil {
		log.Fatalf("FATAL: Failed to initialize storage: %v", err)
	}

	// Initialize Job Metadata Store
	jobStore, err := jobs.NewStore(cfg.DatabasePath, cfg.JobRetentionHours)
	if err != nil {
		log.Fatalf("FATAL: Failed to initialize job store: %v", err)
	}

	// Initialize Worker Dispatcher & Queue
	dispatcher := workers.NewDispatcher(cfg, jobStore, storeStorage)
	jobQueue := jobs.NewQueue(cfg.MaxConcurrentJobs, jobStore, dispatcher)

	// Initialize API Handlers
	apiHandler := handlers.NewAPIHandler(cfg, jobStore, storeStorage, jobQueue)

	// Automatic Background Cleanup Routine
	startCleanupRoutine(storeStorage, jobStore, cfg.JobRetentionHours)

	// Initialize Router
	mux := http.NewServeMux()

	// REST Endpoints
	mux.HandleFunc("/api/health", apiHandler.HealthHandler)
	mux.HandleFunc("/api/jobs", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/jobs" || r.URL.Path == "/api/jobs/" {
			apiHandler.CreateJobHandler(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// Root Handler: AI Toolbox Backend Control Gateway & Status Dashboard
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && !strings.HasPrefix(r.URL.Path, "/dashboard") {
			// Check if static files from frontend dist exist
			distPath := filepath.Join("..", "frontend", "dist", filepath.Clean(r.URL.Path))
			if _, err := os.Stat(distPath); err == nil {
				http.ServeFile(w, r, distPath)
				return
			}
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Toolbox Engine • Backend Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(56, 189, 248, 0.2);
      --cyan: #38bdf8;
      --cyan-glow: rgba(56, 189, 248, 0.35);
      --blue: #3b82f6;
      --emerald: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse 80%% 50%% at 50%% -20%%, rgba(56, 189, 248, 0.15), transparent 70%%),
        radial-gradient(circle at 100%% 100%%, rgba(59, 130, 246, 0.1), transparent 50%%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .container {
      max-width: 900px;
      width: 100%%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 28px;
      backdrop-filter: blur(20px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.1);
      padding: 40px;
      overflow: hidden;
      position: relative;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 999px;
      color: var(--emerald);
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--emerald);
      border-radius: 50%%;
      box-shadow: 0 0 10px var(--emerald);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%%, 100%% { transform: scale(1); opacity: 1; }
      50%% { transform: scale(1.3); opacity: 0.6; }
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 0%%, #bae6fd 50%%, #38bdf8 100%%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
      max-width: 650px;
    }
    .cta-box {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(59, 130, 246, 0.15));
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      sm-flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 32px;
    }
    .cta-text h3 {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    .cta-text p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #38bdf8 0%%, #2563eb 100%%);
      color: #030712;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 14px;
      text-decoration: none;
      box-shadow: 0 0 25px var(--cyan-glow);
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 35px rgba(56, 189, 248, 0.6);
      color: #000;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 18px;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(56, 189, 248, 0.3);
    }
    .card-title {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .card-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
    }
    .endpoints {
      background: rgba(2, 6, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .endpoint-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .endpoint-row:last-child { border-bottom: none; }
    .method {
      color: var(--cyan);
      font-weight: 700;
      margin-right: 8px;
    }
    .url a {
      color: var(--text);
      text-decoration: none;
      transition: color 0.15s;
    }
    .url a:hover { color: var(--cyan); }
    .status-ok { color: var(--emerald); }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">
      <div class="pulse-dot"></div>
      BACKEND NODE ACTIVE • PORT %s
    </div>

    <h1>Anonymous Self-Hosted AI Suite</h1>
    <p class="subtitle">
      Zero-telemetry local backend service is running smoothly. All neural inference, file processing, and workers are operational with complete data privacy.
    </p>

    <div class="cta-box">
      <div class="cta-text">
        <h3>Launch Full Web Application</h3>
        <p>Access the complete interactive UI suite for 3D generation, audio, translation, and more.</p>
      </div>
      <a href="http://localhost:5173" class="btn-primary" target="_blank">
        ⚡ Open Web Application (Port 5173) &rarr;
      </a>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Engine Mode</div>
        <div class="card-value">Autonomous Local Engine</div>
      </div>
      <div class="card">
        <div class="card-title">Database</div>
        <div class="card-value">SQLite Ephemeral Store</div>
      </div>
      <div class="card">
        <div class="card-title">Worker Slots</div>
        <div class="card-value">%d Concurrent Pipelines</div>
      </div>
      <div class="card">
        <div class="card-title">Auto Purge</div>
        <div class="card-value">%d Hours Ephemeral Retention</div>
      </div>
    </div>

    <div class="endpoints">
      <div style="color: #64748b; margin-bottom: 10px; font-size: 11px; text-transform: uppercase;">Active REST Endpoints</div>
      <div class="endpoint-row">
        <div><span class="method">GET</span><span class="url"><a href="/api/health" target="_blank">/api/health</a></span></div>
        <span class="status-ok">200 OK • Health Check</span>
      </div>
      <div class="endpoint-row">
        <div><span class="method">POST</span><span class="url"><a href="/api/jobs" target="_blank">/api/jobs</a></span></div>
        <span style="color: #94a3b8;">Job Creation Pipeline</span>
      </div>
      <div class="endpoint-row">
        <div><span class="method">GET</span><span class="url"><a href="/api/jobs/events" target="_blank">/api/jobs/{id}/events</a></span></div>
        <span style="color: #94a3b8;">SSE Real-Time Progress Stream</span>
      </div>
    </div>
  </div>
</body>
</html>`, cfg.Port, cfg.MaxConcurrentJobs, cfg.JobRetentionHours)
	})

	// Dynamic Job Router
	mux.HandleFunc("/api/jobs/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/events") {
			apiHandler.JobEventsHandler(w, r)
		} else if strings.HasSuffix(path, "/result") {
			apiHandler.GetResultHandler(w, r)
		} else if strings.HasSuffix(path, "/download") {
			apiHandler.DownloadFileHandler(w, r)
		} else if strings.HasSuffix(path, "/file") {
			apiHandler.ServeRawFileHandler(w, r)
		} else if strings.HasSuffix(path, "/cancel") {
			apiHandler.CancelJobHandler(w, r)
		} else if r.Method == http.MethodDelete {
			apiHandler.DeleteJobHandler(w, r)
		} else if r.Method == http.MethodGet {
			apiHandler.GetJobHandler(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// Wrap Middlewares: CORS + IP Rate Limiter (60 req/min)
	rateLimiter := middleware.NewRateLimiter(60, time.Minute)
	handlerWithMiddleware := middleware.EnableCORS(rateLimiter.Limit(mux))

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handlerWithMiddleware,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown listener
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("INFO Server listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("FATAL Server error: %v", err)
		}
	}()

	<-stopChan
	log.Printf("INFO Shutting down server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("ERROR Server shutdown error: %v", err)
	}
	log.Printf("INFO Server stopped.")
}

func startCleanupRoutine(st *storage.Storage, js *jobs.Store, retentionHours int) {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			cleanedFiles, err := st.CleanupOldJobs(retentionHours)
			if err == nil && cleanedFiles > 0 {
				log.Printf("INFO Storage cleanup removed %d expired job folders", cleanedFiles)
			}
			cleanedMeta := js.CleanupOldJobs(retentionHours)
			if cleanedMeta > 0 {
				log.Printf("INFO Store cleanup removed %d expired job records", cleanedMeta)
			}
		}
	}()
}
