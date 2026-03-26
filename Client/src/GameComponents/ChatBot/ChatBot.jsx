import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';
import { useGameContext } from '../../Components/Context';

function ChatBot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const { chat, setChat } = useGameContext();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        // Use the MDN Web Docs scrollIntoView method with smooth behavior
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom(); 
    }, [messages]);

    const handleSendMessage = () => {
        if (input.trim()) {
            setMessages((prevMessages) => [...prevMessages, { text: input, sender: 'user' }]);
            setInput('');
            const botResponse = { text: "This is a bot response.", sender: 'bot' };
            setTimeout(() => {
                setMessages((prevMessages) => [...prevMessages, botResponse]);  
            }, 500);
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