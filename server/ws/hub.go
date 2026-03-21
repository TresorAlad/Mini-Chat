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

type BroadcastMessage struct {
	Data   []byte
	Sender *Client
}

// Hub maintient la liste des clients actifs et diffuse des messages.
type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan BroadcastMessage
	Register   chan *Client
	Unregister chan *Client
	UserConns  map[string]int // Nombre de connexions par utilisateur
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan BroadcastMessage),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
		UserConns:  make(map[string]int),
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
	h.Broadcast <- BroadcastMessage{Data: msg, Sender: nil}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			h.UserConns[client.UserId]++
			log.Printf("Hub: Enregistrement client pour %s (Total user connections: %d)\n", client.UserId, h.UserConns[client.UserId])
			
			if h.UserConns[client.UserId] == 1 {
				updateUserStatus(client.UserId, "online")
				go h.broadcastUserStatus(client.UserId, "online")
			}
			
		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				h.UserConns[client.UserId]--
				log.Printf("Hub: Désenregistrement client pour %s (Restant connections: %d)\n", client.UserId, h.UserConns[client.UserId])
				
				if h.UserConns[client.UserId] <= 0 {
					delete(h.UserConns, client.UserId)
					updateUserStatus(client.UserId, "offline")
					go h.broadcastUserStatus(client.UserId, "offline")
				}
			}
			
		case message := <-h.Broadcast:
			// Diffusion vers tous les clients connectés
			for client := range h.Clients {
				// Ne pas renvoyer le message à la connexion précise qui l'a émis
				if message.Sender != nil && client == message.Sender {
					continue
				}
				select {
				case client.Send <- message.Data:
				default:
					close(client.Send)
					delete(h.Clients, client)
					h.UserConns[client.UserId]--
					if h.UserConns[client.UserId] <= 0 {
						delete(h.UserConns, client.UserId)
						go h.broadcastUserStatus(client.UserId, "offline")
					}
				}
			}
		}
	}
}
