package main

import (
	"log"
	"lunatv-be/internal/api"
	"lunatv-be/internal/config"
	"lunatv-be/internal/database"
	"net/http"
)

func main() {
	// Load application configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("could not load configuration: %v", err)
	}
	log.Println("Configuration loaded.")

	// Initialize database connection
	if err := database.Connect(cfg.Database); err != nil {
		log.Fatalf("could not connect to database: %v", err)
	}
	log.Println("Database connection successful.")

	// Set up the server and router
	server := api.NewServer(cfg)
	router := server.NewRouter()

	log.Printf("Server starting on port %s", cfg.Server.Port)
	if err := http.ListenAndServe(":"+cfg.Server.Port, router); err != nil {
		log.Fatalf("could not start server: %v", err)
	}
}
