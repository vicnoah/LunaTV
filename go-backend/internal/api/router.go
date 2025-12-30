package api

import (
	"encoding/json"
	"lunatv-be/internal/auth"
	"lunatv-be/internal/config"
	"lunatv-be/internal/database"
	"lunatv-be/internal/models"
	"lunatv-be/internal/socketio"
	"net/http"
)

// Server holds the dependencies for the API server.
type Server struct {
	Config config.Config
}

// NewServer creates a new API server with the given configuration.
func NewServer(cfg config.Config) *Server {
	return &Server{Config: cfg}
}

// NewRouter creates and configures a new HTTP router.
func (s *Server) NewRouter() *http.ServeMux {
	socketServer := socketio.NewSocketIOServer()

	router := http.NewServeMux()

	router.Handle("/socket.io/", socketServer.HttpHandler())
	router.HandleFunc("/api/register", s.handleRegister)
	router.HandleFunc("/api/login", s.handleLogin)
	router.HandleFunc("/api/bing-wallpaper", handleGetWallpaper) // This one has no dependencies yet

	return router
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	user := &models.User{Username: creds.Username}
	if err := user.SetPassword(creds.Password); err != nil {
		http.Error(w, "Failed to process password", http.StatusInternalServerError)
		return
	}

	if result := database.DB.Create(user); result.Error != nil {
		http.Error(w, "Could not create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user models.User
	if result := database.DB.Where("username = ?", creds.Username).First(&user); result.Error != nil {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	if !user.CheckPassword(creds.Password) {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateJWT(user.ID, s.Config.JWT)
	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}
