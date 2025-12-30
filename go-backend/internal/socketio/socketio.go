package socketio

import (
	"log"
	"net/http"

	socketio "github.com/doquangtan/socketio/v4"
)

// NewSocketIOServer creates and configures a new Socket.IO server.
func NewSocketIOServer() *socketio.Io {
	io := socketio.New()

	// Handle new connections
	io.OnConnection(func(socket *socketio.Socket) {
		log.Printf("Socket.IO connected: %s", socket.Id)

		// --- Watch Room Logic Placeholder ---
		// Here we will add handlers for events like:
		// - "join-room": To add a user to a specific media watch room.
		// - "leave-room": To remove a user from a room.
		// - "player-event": To broadcast playback events (play, pause, seek) to others in the room.
		//
		// Example:
		// socket.On("join-room", func(payload *socketio.EventPayload) {
		// 	// Assuming room name is the first data element
		// 	if len(payload.Data) > 0 {
		// 		if room, ok := payload.Data[0].(string); ok {
		// 			socket.Join(room)
		// 			log.Printf("Client %s joined room %s", socket.Id, room)
		// 		}
		// 	}
		// })

		// Handle disconnections
		socket.On("disconnect", func(payload *socketio.EventPayload) {
			// The disconnect reason is not directly provided in the same way as socket.io-client.
			// We log the payload for debugging purposes.
			log.Printf("Socket.IO disconnected: %s, payload: %+v", socket.Id, payload)
		})
	})

	return io
}

// ServeHTTP is a placeholder and not directly used with this library's integration method.
func ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// This function is not needed with the current integration approach,
	// as the server's HttpHandler() is used directly.
}
