package routes

import (
	"github.com/gofiber/fiber/v2"
	"minichat-server/controllers"
	"minichat-server/middleware"
	"minichat-server/ws"
)

func SetupRoutes(app *fiber.App, hub *ws.Hub) {
	api := app.Group("/api")

	// Routes publiques (Auth)
	api.Post("/register", controllers.Register)
	api.Post("/login", controllers.Login)

	// Routes protégées (JWT requis)
	protected := api.Group("/", middleware.JWTAuth())

	// Utilisateurs
	protected.Get("users", controllers.GetUsers)
	protected.Get("users/search", controllers.SearchUsers)

	// Conversations
	protected.Get("conversations", controllers.GetConversations)
	protected.Post("conversations", controllers.CreateOrGetConversation)

	// Messages
	protected.Get("messages/:conversationId", controllers.GetMessages)

	// WebSocket (pas de JWT pour simplifier la mise en place)
	app.Get("/ws/:userId", ws.ServeWebSocket(hub))
}
