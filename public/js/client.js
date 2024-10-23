// public/js/client.js
const socket = io();
let username = '';
let selectedUser = null;

function joinChat() {
    username = document.getElementById('username-input').value.trim();
    if (username) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('chat-screen').style.display = 'flex';
        document.getElementById('current-user').textContent = username;
        socket.emit('join', username);
    }
}

function createMessageElement(message, isSystem = false) {
    if (isSystem) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.textContent = message;
        return div;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender === username ? 'sent' : 'received'}`;
    if (message.isPrivate) {
        messageDiv.classList.add('private');
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message.text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    const privateLabel = message.isPrivate ? '[Private] ' : '';
    timeDiv.textContent = `${privateLabel}${message.sender} • ${message.timestamp}`;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    return messageDiv;
}

function updateUserList(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    
    users.forEach(user => {
        if (user !== username) {
            const li = document.createElement('li');
            li.className = 'user-item';
            li.textContent = user;
            li.onclick = () => selectUser(user);
            if (user === selectedUser) {
                li.classList.add('active');
            }
            userList.appendChild(li);
        }
    });
}

function selectUser(user) {
    selectedUser = user;
    document.getElementById('chatTypeIndicator').textContent = 
        `Private Chat with ${user}`;
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === user) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('messageContainer').innerHTML = '';
    socket.emit('getPrivateHistory', { otherUser: user });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (text) {
        if (selectedUser) {
            socket.emit('privateMessage', {
                recipient: selectedUser,
                text: text
            });
        } else {
            socket.emit('message', { text });
        }
        input.value = '';
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Socket event listeners
socket.on('message', (message) => {
    if (!selectedUser) {
        const container = document.getElementById('messageContainer');
        container.appendChild(createMessageElement(message));
        container.scrollTop = container.scrollHeight;
    }
});

socket.on('privateMessage', (message) => {
    if (selectedUser && 
        (message.sender === selectedUser || message.recipient === selectedUser)) {
        const container = document.getElementById('messageContainer');
        container.appendChild(createMessageElement(message));
        container.scrollTop = container.scrollHeight;
    }
});

socket.on('privateHistory', ({ history, otherUser }) => {
    if (selectedUser === otherUser) {
        const container = document.getElementById('messageContainer');
        history.forEach(message => {
            container.appendChild(createMessageElement(message));
        });
        container.scrollTop = container.scrollHeight;
    }
});

socket.on('userList', (users) => {
    updateUserList(users);
});

socket.on('userJoined', ({ username, onlineUsers }) => {
    updateUserList(onlineUsers);
    const container = document.getElementById('messageContainer');
    if (!selectedUser) {
        container.appendChild(createMessageElement(`${username} joined the chat`, true));
        container.scrollTop = container.scrollHeight;
    }
});

socket.on('userLeft', ({ username, onlineUsers }) => {
    updateUserList(onlineUsers);
    if (username === selectedUser) {
        selectedUser = null;
        document.getElementById('chatTypeIndicator').textContent = 'Public Chat';
        document.getElementById('messageContainer').innerHTML = '';
    }
    if (!selectedUser) {
        const container = document.getElementById('messageContainer');
        container.appendChild(createMessageElement(`${username} left the chat`, true));
        container.scrollTop = container.scrollHeight;
    }
});