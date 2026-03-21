package routes

import (
	"minichat-server/controllers"
	"minichat-server/middleware"
	"minichat-server/ws"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App, hub *ws.Hub) {
	api := app.Group("/api")

	// Routes publiques (Auth)
	api.Post("/register", controllers.Register)
	api.Post("/login", controllers.Login)

	// Routes protégées (JWT requis)
	protected := api.Group("/", middleware.JWTAuth())

	// Utilisateurs
	protected.Get("/users", controllers.GetUsers)
	protected.Get("/users/search", controllers.SearchUsers)

	// Conversations et Groupes
	protected.Get("/conversations", controllers.GetConversations)
	protected.Post("/conversations", controllers.CreateOrGetConversation)
	protected.Post("/groups", controllers.CreateGroup)

	// Messages
	protected.Get("/messages/:conversationId", controllers.GetMessages)

	// WebSocket (authentification par token dans la requête)
	app.Get("/ws", ws.ServeWebSocket(hub))
}
