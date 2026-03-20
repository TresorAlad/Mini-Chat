package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func ConnectDB() {
	if err := godotenv.Load(); err != nil {
		log.Println("Pas de fichier .env trouvé, on utilise les variables d'environnement système")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017" // fallback
	}

	clientOptions := options.Client().ApplyURI(mongoURI)
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Impossible de se connecter à MongoDB:", err)
	}

	log.Println("Connecté à MongoDB ✅")
	DB = client.Database("minichat")
}
