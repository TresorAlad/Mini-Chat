package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"minichat-server/config"
)

// Hub maintient la liste des clients actifs et diffuse des messages.
type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[string]*Client),
	}
}

func updateUserStatus(userId string, status string) {
	if config.DB != nil {
		coll := config.DB.Collection("users")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		oid, err := primitive.ObjectIDFromHex(userId)
		if err == nil {
			coll.UpdateByID(ctx, oid, bson.M{"$set": bson.M{"status": status}})
		}
	}
}

func (h *Hub) broadcastUserStatus(userId string, status string) {
	msg, _ := json.Marshal(map[string]interface{}{
		"type":    "user_status",
		"user_id": userId,
		"status":  status,
	})
	h.Broadcast <- msg
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client.UserId] = client
			log.Printf("Hub: Enregistrement utilisateur %s (Total: %d)\n", client.UserId, len(h.Clients))
			updateUserStatus(client.UserId, "online")
			go h.broadcastUserStatus(client.UserId, "online")
			
		case client := <-h.Unregister:
			if existingClient, ok := h.Clients[client.UserId]; ok && existingClient == client {
				delete(h.Clients, client.UserId)
				close(client.Send)
				log.Printf("Hub: Désenregistrement utilisateur %s (Restant: %d)\n", client.UserId, len(h.Clients))
				updateUserStatus(client.UserId, "offline")
				go h.broadcastUserStatus(client.UserId, "offline")
			}
			
		case message := <-h.Broadcast:
			// Diffusion non-bloquante pour éviter qu'un client lent ne gèle tout le serveur
			for _, client := range h.Clients {
				select {
				case client.Send <- message:
					// Message envoyé avec succès au buffer du client
				default:
					// Buffer du client plein (client trop lent), on le débranche proprement
					log.Printf("Hub: Client %s trop lent, déconnexion forcée\n", client.UserId)
					delete(h.Clients, client.UserId)
					close(client.Send)
					client.Conn.Close()
				}
			}
		}
	}
}
