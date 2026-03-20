package controllers

import (
	"context"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"

	"minichat-server/config"
	"minichat-server/models"
)

type RegisterInput struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(c *fiber.Ctx) error {
	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if input.Username == "" || input.Email == "" || input.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tous les champs sont requis"})
	}

	collection := config.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Vérifier si l'email existe déjà
	var existing models.User
	err := collection.FindOne(ctx, bson.M{"email": input.Email}).Decode(&existing)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Cet email est déjà utilisé"})
	}

	// Vérifier si le username existe déjà
	err = collection.FindOne(ctx, bson.M{"username": input.Username}).Decode(&existing)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ce nom d'utilisateur est déjà pris"})
	}

	// Hasher le mot de passe
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur serveur"})
	}

	user := models.User{
		ID:        primitive.NewObjectID(),
		Username:  input.Username,
		Email:     input.Email,
		Password:  string(hashedPassword),
		Status:    "offline",
		CreatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer l'utilisateur"})
	}

	// Générer le token JWT
	token, err := generateJWT(user.ID.Hex(), user.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur génération token"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Utilisateur créé avec succès",
		"token":   token,
		"user": fiber.Map{
			"_id":      user.ID.Hex(),
			"username": user.Username,
			"email":    user.Email,
			"status":   user.Status,
		},
	})
}

func Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if input.Email == "" || input.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email et mot de passe requis"})
	}

	collection := config.DB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := collection.FindOne(ctx, bson.M{"email": input.Email}).Decode(&user)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Email ou mot de passe incorrect"})
	}

	// Comparer le mot de passe
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Email ou mot de passe incorrect"})
	}

	// Mettre le statut en ligne
	collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"status": "online"}})

	// Générer le token JWT
	token, err := generateJWT(user.ID.Hex(), user.Username)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur génération token"})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"_id":      user.ID.Hex(),
			"username": user.Username,
			"email":    user.Email,
			"status":   "online",
		},
	})
}

func generateJWT(userId string, username string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "minichat-secret-key"
	}

	claims := jwt.MapClaims{
		"userId":   userId,
		"username": username,
		"exp":      time.Now().Add(72 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
