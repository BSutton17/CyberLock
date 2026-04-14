import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';
import { useGameContext } from '../../Components/Context';

function ChatBot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const { setChat, room, socket, playerName } = useGameContext();
    const messagesEndRef = useRef(null);
    const pendingRequestIdsRef = useRef(new Set());

    const scrollToBottom = () => {
        // Use the MDN Web Docs scrollIntoView method with smooth behavior
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    useEffect(() => {
        if (!socket) return;

        const handleAiMessage = ({ requestId, eventType, response }) => {
            if (eventType !== 'chat_message') return;
            if (!pendingRequestIdsRef.current.has(requestId)) return;

            pendingRequestIdsRef.current.delete(requestId);
            setIsThinking(false);
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: response || 'No response received.', sender: 'ai' }
            ]);
        };

        const handleAiThinking = ({ requestId, thinking, eventType }) => {
            if (eventType !== 'chat_message') return;
            if (!pendingRequestIdsRef.current.has(requestId)) return;
            setIsThinking(Boolean(thinking));
        };

        const handleAiError = ({ requestId, error }) => {
            if (!pendingRequestIdsRef.current.has(requestId)) return;

            pendingRequestIdsRef.current.delete(requestId);
            setIsThinking(false);
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: `AI error: ${error || 'Request failed.'}`, sender: 'ai' }
            ]);
        };

        socket.on('ai_message', handleAiMessage);
        socket.on('ai_thinking', handleAiThinking);
        socket.on('ai_error', handleAiError);

        return () => {
            socket.off('ai_message', handleAiMessage);
            socket.off('ai_thinking', handleAiThinking);
            socket.off('ai_error', handleAiError);
        };
    }, [socket, room]);

    const handleSendMessage = () => {
        if (input.trim()) {
            const trimmed = input.trim();
            const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            setMessages((prevMessages) => [...prevMessages, { text: trimmed, sender: 'user' }]);
            pendingRequestIdsRef.current.add(requestId);

            socket.emit('ai_request', {
                requestId,
                room,
                eventType: 'chat_message',
                message: trimmed,
                data: {
                    source: 'chatbot',
                    player: playerName
                },
                characterName: playerName,
                playerName
            });
            setInput('');

        }
    };

    return (
        <div className='chatbot-background'>
            <h1 className='title-chat'>Chat Bot</h1>
        <button className="close-button" onClick={() => setChat(false)}> X </button>
        <div className="chatbot-container">
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
                {isThinking && (
                    <div className="message ai-thinking">AI is thinking...</div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <input
                    className="message-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                />
                <button className="send-button" onClick={handleSendMessage}>Send</button>
            </div>
        </div>
        </div>
    );
}

export default ChatBot;