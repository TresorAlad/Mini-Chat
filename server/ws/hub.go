package ws

import "log"

// Hub maintient la liste des clients actifs et diffuse des messages.
type Hub struct {
	// Registered clients map[userId]*Client
	Clients map[string]*Client

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
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

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client.UserId] = client
			log.Printf("Nouvel utilisateur connecté: %s\n", client.UserId)
			
		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserId]; ok {
				delete(h.Clients, client.UserId)
				client.Conn.Close()
				log.Printf("Utilisateur déconnecté: %s\n", client.UserId)
			}
			
		case message := <-h.Broadcast:
			// Pour un simple exemple global de broadcasting :
			// Pour des conversations 1-1, il faudra décoder \`message\` en JSON
			// et l'envoyer au \`recipient_id\`.
			for _, client := range h.Clients {
				client.Send <- message
			}
		}
	}
}
