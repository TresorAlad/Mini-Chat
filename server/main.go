package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"

	"minichat-server/config"
	"minichat-server/routes"
	"minichat-server/ws"
)

func main() {
	// 1. Initialiser la BD
	config.ConnectDB()

	// 2. Lancer le hub WebSocket
	hub := ws.NewHub()
	go hub.Run()

	app := fiber.New()

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// API Routes
	routes.SetupRoutes(app, hub)

	// Port dynamique pour Render (ou 8080 par défaut en local)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Serveur Go démarré sur http://localhost:%s", port)
	log.Fatal(app.Listen(":" + port))
}
