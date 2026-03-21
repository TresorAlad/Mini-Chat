package controllers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"minichat-server/config"
	"minichat-server/models"
)

// GetConversations retourne la liste des conversations d'un utilisateur
func GetConversations(c *fiber.Ctx) error {
	userId := c.Locals("userId").(string)

	collection := config.DB.Collection("conversations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"participants": userId}
	opts := options.Find().SetSort(bson.M{"updated_at": -1})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur serveur"})
	}
	defer cursor.Close(ctx)

	var conversations []models.Conversation
	if err := cursor.All(ctx, &conversations); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lecture"})
	}

	if conversations == nil {
		conversations = []models.Conversation{}
	}

	return c.JSON(conversations)
}

// CreateOrGetConversation crée ou récupère une conversation entre 2 utilisateurs
func CreateOrGetConversation(c *fiber.Ctx) error {
	userId := c.Locals("userId").(string)

	var input struct {
		ParticipantID string `json:"participant_id"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	collection := config.DB.Collection("conversations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Chercher une conversation existante entre les deux
	filter := bson.M{
		"participants": bson.M{
			"$all":  bson.A{userId, input.ParticipantID},
			"$size": 2,
		},
	}

	var conversation models.Conversation
	err := collection.FindOne(ctx, filter).Decode(&conversation)
	if err == nil {
		return c.JSON(conversation)
	}

	// Créer une nouvelle conversation
	conversation = models.Conversation{
		ID:           primitive.NewObjectID(),
		Participants: []string{userId, input.ParticipantID},
		LastMessage:  "",
		UpdatedAt:    time.Now(),
	}

	_, err = collection.InsertOne(ctx, conversation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer la conversation"})
	}

	return c.Status(fiber.StatusCreated).JSON(conversation)
}

// CreateGroup crée une nouvelle conversation de groupe
func CreateGroup(c *fiber.Ctx) error {
	userId := c.Locals("userId").(string)

	var input struct {
		Name         string   `json:"name"`
		Participants []string `json:"participants"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if input.Name == "" || len(input.Participants) < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom et participants requis"})
	}

	participantsMap := make(map[string]bool)
	participantsMap[userId] = true
	for _, p := range input.Participants {
		participantsMap[p] = true
	}
	
	var finalParticipants []string
	for p := range participantsMap {
		finalParticipants = append(finalParticipants, p)
	}

	collection := config.DB.Collection("conversations")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conversation := models.Conversation{
		ID:           primitive.NewObjectID(),
		Participants: finalParticipants,
		IsGroup:      true,
		Name:         input.Name,
		LastMessage:  "Groupe créé",
		UpdatedAt:    time.Now(),
	}

	_, err := collection.InsertOne(ctx, conversation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer le groupe"})
	}

	return c.Status(fiber.StatusCreated).JSON(conversation)
}

// GetMessages retourne l'historique des messages pour une conversation
func GetMessages(c *fiber.Ctx) error {
	conversationId := c.Params("conversationId")

	collection := config.DB.Collection("messages")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"conversation_id": conversationId}
	opts := options.Find().SetSort(bson.M{"created_at": 1}).SetLimit(100)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur serveur"})
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lecture"})
	}

	if messages == nil {
		messages = []models.Message{}
	}

	return c.JSON(messages)
}

// GetUsers retourne la liste des utilisateurs (sauf l'utilisateur connecté)
func GetUsers(c *fiber.Ctx) error {
	userId := c.Locals("userId").(string)

	collection := config.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectId, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	filter := bson.M{"_id": bson.M{"$ne": objectId}}
	opts := options.Find().SetProjection(bson.M{"password": 0})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur serveur"})
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lecture"})
	}

	if users == nil {
		users = []models.User{}
	}

	return c.JSON(users)
}

// SearchUsers recherche des utilisateurs par nom
func SearchUsers(c *fiber.Ctx) error {
	query := c.Query("q")
	userId := c.Locals("userId").(string)

	if query == "" {
		return c.JSON([]models.User{})
	}

	collection := config.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectId, _ := primitive.ObjectIDFromHex(userId)

	filter := bson.M{
		"_id": bson.M{"$ne": objectId},
		"username": bson.M{
			"$regex":   query,
			"$options": "i",
		},
	}
	opts := options.Find().SetProjection(bson.M{"password": 0}).SetLimit(20)

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur serveur"})
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lecture"})
	}

	if users == nil {
		users = []models.User{}
	}

	return c.JSON(users)
}
