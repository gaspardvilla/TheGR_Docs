import React, { useEffect, useState } from 'react';

import { useDocAIAgent } from '../../doc-editor/api/useDocAIAgent';

type Message = {
  text: string;
  sender: string;
};

type AgentAnswer = {
  answer: string;
  query: string;
};

export default function FloatingChat() {
  // State
  const [open, setOpen] = useState(Boolean);
  const [messages, setMessages] = useState(Array<Message>);
  const [input, setInput] = useState(String);
  const [agentWriting, setAgentWriting] = useState(Boolean);
  const [geekViewCounter, setGeekViewCounter] = useState(0);
  const [geekViewEnabled, setGeekViewEnabled] = useState(false);

  // Refs
  const chatMessageEl = React.useRef<HTMLDivElement>(null);

  // Custom hooks
  const { mutateAsync: requestAI } = useDocAIAgent();

  // Handle message sending
  const handleSentMessage = () => {
    const trimmed = input.trim();
    if (trimmed) {
      // Add user message in chat
      const newMessages = [...messages, { text: trimmed, sender: 'user' }];
      setMessages(newMessages);

      requestAI({
        prompt: input,
      })
        .then((responseAI) => {
          if (!responseAI?.answer) {
            throw new Error('No response from AI');
          } else {
            handleAgentAnswer({
              answer: responseAI.answer,
              query: responseAI.query,
            });
          }
        })
        .catch((err) => {
          handleAgentAnswer({
            answer:
              "Sorry, I didn\'t understand or the request didnt work ! Please try again.",
            query: '',
          });
          console.error('Back-end error : ' + err);
        });

      setInput('');
      setAgentWriting(true);

      // TODO : Fetch request
      // const aiRequest = await fetch('{endpoint}');
      // const aiResponse = await aiRequest.json();

      // Fake aiResponse answer
      // handleAgentAnswer({
      //   answer: `Hello ${trimmed}`,
      //   query: 'SELECT * FROM table',
      // });
    }
  };

  // Handle bot answer
  const handleAgentAnswer = (answer: AgentAnswer) => {
    setTimeout(() => {
      setAgentWriting(false);
      setMessages((prev) => [...prev, { text: answer.answer, sender: 'bot' }]);
    }, 500);
  };

  // Auto scroll to bottom each time
  // a new message is sent
  const scrollMessagesToBottom = () => {
    const scrollHeight = chatMessageEl.current?.scrollHeight ?? 0;
    const clientHeight = chatMessageEl.current?.clientHeight ?? 0;
    const scrollMax = Math.abs(scrollHeight - clientHeight);
    chatMessageEl.current?.scrollTo(0, scrollMax);
  };

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages]);

  // Trigger hidden geek view
  useEffect(() => {
    // If user click AI agent 5 times,
    // enable geek view
    if (geekViewCounter == 3) {
      setGeekViewEnabled(true);
      setGeekViewCounter(0);
    }

    // Reset geek view when displayed
    if (geekViewEnabled && geekViewCounter == 1) {
      setGeekViewEnabled(false);
      setGeekViewCounter(0);
    }
  }, [geekViewCounter, geekViewEnabled]);

  return (
    <div
      className={
        geekViewEnabled
          ? 'floating-chat-container geek'
          : 'floating-chat-container'
      }
    >
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <div
                className="chat-avatar"
                onClick={() => setGeekViewCounter(geekViewCounter + 1)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
              >
                {geekViewEnabled ? '👾' : 'AI'}
              </div>
              <span className="chat-title">The GR</span>
            </div>
            <button
              className="chat-close-btn"
              onClick={() => {
                setOpen(false);
              }}
            >
              ×
            </button>
          </div>

          <div className="chat-messages" ref={chatMessageEl}>
            <div className="chat-bubble agent">
              What is your issue or request?
            </div>

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'agent'}`}
              >
                {msg.text}
              </div>
            ))}
            <div
              className={
                agentWriting
                  ? 'chat-bubble agent writing'
                  : 'chat-bubble agent writing hidden'
              }
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="chat-input-container">
            <input
              autoFocus={open}
              className="chat-input"
              type="text"
              placeholder="Please type your request"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSentMessage()}
            />
            <button className="chat-send-btn" onClick={handleSentMessage}>
              ➤
            </button>
          </div>
        </div>
      )}

      <button className="floating-button" onClick={() => setOpen(true)}>
        {geekViewEnabled ? '👾' : '💬'}
      </button>
    </div>
  );
}
