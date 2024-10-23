// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 3000;

app.use(express.static('public'));

// Store connected users and their socket IDs
let users = new Map();
let privateChats = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle user joining
    socket.on('join', (username) => {
        users.set(socket.id, username);
        // Send the list of online users to the newly connected user
        const onlineUsers = Array.from(users.values());
        socket.emit('userList', onlineUsers);
        io.emit('userJoined', { username, onlineUsers });
    });

    // Handle public messages
    socket.on('message', (data) => {
        const message = {
            sender: users.get(socket.id),
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
            isPrivate: false
        };
        io.emit('message', message);
    });

    // Handle private messages
    socket.on('privateMessage', (data) => {
        const sender = users.get(socket.id);
        const { recipient, text } = data;
        
        // Find recipient's socket ID
        const recipientSocketId = Array.from(users.entries())
            .find(([_, username]) => username === recipient)?.[0];

        if (recipientSocketId) {
            const message = {
                sender,
                recipient,
                text,
                timestamp: new Date().toLocaleTimeString(),
                isPrivate: true
            };

            // Store private chat history
            const chatKey = [sender, recipient].sort().join('-');
            if (!privateChats.has(chatKey)) {
                privateChats.set(chatKey, []);
            }
            privateChats.get(chatKey).push(message);

            // Send to both sender and recipient
            socket.emit('privateMessage', message);
            io.to(recipientSocketId).emit('privateMessage', message);
        }
    });

    // Handle private chat history request
    socket.on('getPrivateHistory', (data) => {
        const { otherUser } = data;
        const currentUser = users.get(socket.id);
        const chatKey = [currentUser, otherUser].sort().join('-');
        const history = privateChats.get(chatKey) || [];
        socket.emit('privateHistory', { history, otherUser });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        users.delete(socket.id);
        const onlineUsers = Array.from(users.values());
        io.emit('userLeft', { username, onlineUsers });
    });
});

http.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});