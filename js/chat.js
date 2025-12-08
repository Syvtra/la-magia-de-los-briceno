const Chat = {
    messages: [],
    receiverId: null,
    subscription: null,
    
    async init() {
        if (!Auth.currentUser) return;
        
        try {
            const assignment = await db.getAssignment(Auth.currentUser.id);
            
            if (!assignment) {
                this.showNoAssignment();
                return;
            }
            
            this.receiverId = assignment.receiver_id;
            await this.loadMessages();
            this.subscribeToMessages();
            
        } catch (error) {
            console.error('Error initializing chat:', error);
            showToast('Error al cargar el chat', 'error');
        }
    },
    
    showNoAssignment() {
        const container = Utils.$('#chat-messages');
        if (!container) return;
        
        container.innerHTML = `
            <div class="chat-empty">
                <span class="chat-empty-icon">🎄</span>
                <p>El sorteo aún no se ha realizado</p>
                <p style="font-size: 0.8rem; margin-top: 8px;">
                    Cuando tengas asignado un amigo secreto, podrás enviarle mensajes anónimos
                </p>
            </div>
        `;
    },
    
    async loadMessages() {
        if (!this.receiverId) return;
        
        try {
            this.messages = await db.getMessages(Auth.currentUser.id, this.receiverId);
            this.render();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    },
    
    render() {
        const container = Utils.$('#chat-messages');
        if (!container) return;
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    <span class="chat-empty-icon">💌</span>
                    <p>Envía un mensaje anónimo a tu amigo secreto</p>
                    <p style="font-size: 0.8rem; margin-top: 8px;">
                        Tus mensajes aparecerán como "Duende Mensajero"
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.messages.map(msg => {
            const isSent = msg.sender_id === Auth.currentUser.id;
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <div class="message-text">${Utils.sanitizeHTML(msg.message)}</div>
                    <div class="message-time">${Utils.formatTime(msg.created_at)}</div>
                </div>
            `;
        }).join('');
        
        this.scrollToBottom();
    },
    
    scrollToBottom() {
        const container = Utils.$('#chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },
    
    async sendMessage(text) {
        if (!text.trim() || !this.receiverId) return;
        
        try {
            const message = await db.sendMessage({
                sender_id: Auth.currentUser.id,
                receiver_id: this.receiverId,
                message: text.trim()
            });
            
            this.messages.push(message);
            this.render();
            
            Spirit.addPoints('sendMessage');
            Effects.playSound('click');
            
            const statMessages = Utils.$('#stat-messages');
            if (statMessages) {
                const current = parseInt(statMessages.textContent) || 0;
                statMessages.textContent = current + 1;
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error al enviar mensaje', 'error');
        }
    },
    
    subscribeToMessages() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        
        this.subscription = db.subscribeToMessages(Auth.currentUser.id, (payload) => {
            if (payload.new && payload.new.sender_id === this.receiverId) {
                this.messages.push(payload.new);
                this.render();
                Effects.playSound('notification');
                
                // Enviar notificación push si la app no está enfocada
                Notifications.notifyNewMessage();
            }
        });
    },
    
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
};

function initChatEvents() {
    const chatForm = Utils.$('#chat-form');
    const chatInput = Utils.$('#chat-input');
    
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const text = chatInput.value;
            chatInput.value = '';
            
            await Chat.sendMessage(text);
        });
    }
}
