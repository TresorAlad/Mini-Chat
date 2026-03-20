package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	ID             primitive.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
	ConversationID string             `json:"conversation_id" bson:"conversation_id"`
	SenderID       string             `json:"sender_id" bson:"sender_id"`
	Content        string             `json:"content" bson:"content"`
	IsRead         bool               `json:"is_read" bson:"is_read"`
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
}

type Conversation struct {
	ID           primitive.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
	Participants []string           `json:"participants" bson:"participants"`
	LastMessage  string    `json:"last_message" bson:"last_message"`
	UpdatedAt    time.Time `json:"updated_at" bson:"updated_at"`
}
