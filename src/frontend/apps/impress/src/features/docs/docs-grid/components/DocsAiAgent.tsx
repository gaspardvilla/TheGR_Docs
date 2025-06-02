import React, { useState } from 'react';

export default function FloatingChat() {
  const [open, setOpen] = useState(Boolean);
  const [messages, setMessages] = useState(Array<string>);
  const [input, setInput] = useState(String);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div className="floating-chat-container">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-avatar">AI</div>
              <span className="chat-title">The GR</span>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div className="chat-messages">
            <div className="chat-bubble">What do you want to do?</div>
            {messages.map((msg: string, idx: number) => (
              <div key={idx} className="chat-bubble user">
                {msg}
              </div>
            ))}
          </div>

          <div className="chat-input-container">
            <input
              className="chat-input"
              type="text"
              placeholder="Please type your request"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="chat-send-btn" onClick={handleSend}>
              ➤
            </button>
          </div>
        </div>
      )}

      <button className="floating-button" onClick={() => setOpen(true)}>
        💬
      </button>
    </div>
  );
}
