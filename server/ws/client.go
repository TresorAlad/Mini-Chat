package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	
	"minichat-server/config"
	"minichat-server/models"
)

// Client est l'enveloppe de la connexion WebSocket pour un seul utilisateur.
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserId string
	mu     sync.Mutex
}

// ReadPump capture les messages entrant venant du frontend.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Erreur lecture: %v", err)
			}
			break
		}

		// 1. Parser le message JSON provenant du frontend
		var payload struct {
			Type           string `json:"type"` // "message", "read", ou "delete_message"
			ConversationID string `json:"conversation_id"`
			Content        string `json:"content"`
			MessageID      string `json:"message_id"` // Utilisé pour la suppression
			TempID         string `json:"temp_id"`    // ID unique temporaire généré par le client
		}
		if err := json.Unmarshal(message, &payload); err != nil {
			log.Println("Erreur parsing message:", err)
			continue
		}

		if payload.Type == "delete_message" && payload.MessageID != "" {
			if config.DB != nil {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				msgCollection := config.DB.Collection("messages")
				if objID, err := primitive.ObjectIDFromHex(payload.MessageID); err == nil {
					// Optionnel : on pourrait vérifier que le sender est bien c.UserId avant de delete
					msgCollection.DeleteOne(ctx, bson.M{"_id": objID})
				}
				cancel()
			}
			
			// Retransmettre l'événement de suppression aux autres participants
			deletion, _ := json.Marshal(map[string]interface{}{
				"type":            "delete_message",
				"conversation_id": payload.ConversationID,
				"message_id":      payload.MessageID,
			})
			c.Hub.Broadcast <- BroadcastMessage{Data: deletion, Sender: c}
			continue
		}

		if payload.Type == "read" {
			// Marquer les messages comme lus dans cette conversation
			if config.DB != nil {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				msgCollection := config.DB.Collection("messages")
				filter := bson.M{
					"conversation_id": payload.ConversationID,
					"sender_id":       bson.M{"$ne": c.UserId},
					"is_read":         false,
				}
				update := bson.M{"$set": bson.M{"is_read": true}}
				msgCollection.UpdateMany(ctx, filter, update)
				cancel()
			}
			// Retransmettre l'accusé de lecture à l'autre utilisateur
			receipt, _ := json.Marshal(map[string]interface{}{
				"type":            "read_receipt",
				"conversation_id": payload.ConversationID,
				"reader_id":       c.UserId,
			})
			c.Hub.Broadcast <- BroadcastMessage{Data: receipt, Sender: c}
			continue
		}

		// 2. Création de l'objet Message structuré
		newMessage := models.Message{
			ConversationID: payload.ConversationID,
			SenderID:       c.UserId,
			Content:        payload.Content,
			IsRead:         false,
			CreatedAt:      time.Now(),
		}

		// 3. Insertion dans MongoDB
		if config.DB != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			collection := config.DB.Collection("messages")
			
			res, err := collection.InsertOne(ctx, newMessage)
			if err != nil {
				log.Println("Erreur sauvegarde MongoDB:", err)
			} else {
				if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
					newMessage.ID = oid
				}
			}

			// Mise à jour de la conversation avec le dernier message
			if convoObjID, err := primitive.ObjectIDFromHex(payload.ConversationID); err == nil {
				convoCollection := config.DB.Collection("conversations")
				update := bson.M{
					"$set": bson.M{
						"last_message": payload.Content,
						"updated_at":   time.Now(),
					},
				}
				convoCollection.UpdateByID(ctx, convoObjID, update)
			}

			cancel()
		}

		// 4. Rediffusion du message structuré au format JSON
		// On crée une map pour pouvoir ajouter le TempID lors du broadcast
		msgMap := map[string]interface{}{
			"id":              newMessage.ID.Hex(),
			"_id":             newMessage.ID.Hex(),
			"sender_id":       newMessage.SenderID,
			"content":         newMessage.Content,
			"conversation_id": newMessage.ConversationID,
			"created_at":      newMessage.CreatedAt,
			"temp_id":         payload.TempID,
		}
		savedMessageJSON, _ := json.Marshal(msgMap)
		c.Hub.Broadcast <- BroadcastMessage{Data: savedMessageJSON, Sender: c}
	}
}

// WritePump est utilisé pour envoyer des messages du Hub vers le Frontend React.
func (c *Client) WritePump() {
	defer func() {
		c.SafeClose()
	}()
	for message := range c.Send {
		err := c.SafeWrite(websocket.TextMessage, message)
		if err != nil {
			return
		}
	}
}

// SafeWrite fournit une écriture thread-safe sur la connexion
func (c *Client) SafeWrite(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteMessage(messageType, data)
}

// SafeClose fournit une fermeture thread-safe de la connexion
func (c *Client) SafeClose() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.Close()
}

// ServeWebSocket met à niveau la requête HTTP de React vers WebSocket
func ServeWebSocket(hub *Hub) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Vérifier si protocol WebSocket ("ws://")
		if websocket.IsWebSocketUpgrade(c) {
			userId := c.Params("userId")

			return websocket.New(func(conn *websocket.Conn) {
				client := &Client{
					Hub:    hub,
					Conn:   conn,
					UserId: userId,
					Send:   make(chan []byte, 256), // Buffer de transmission
				}

				// L'enregistrer dans nos connexions actives
				hub.Register <- client

				// Gérer en asynchrone pour ne pas bloquer le thread principal Fiber
				go client.WritePump()
				client.ReadPump() // Bloquant tant que le client est connecté
			})(c)
		}
		return fiber.ErrUpgradeRequired
	}
}
