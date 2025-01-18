import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AiChat() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Hello! I am KIARA, your AI assistant. How can I help you with cryptocurrency analysis today?"
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response for now until we properly implement the AI service
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm currently in maintenance mode. I'll be back online soon to help you with your crypto queries!"
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <Card className="flex flex-col h-full bg-transparent backdrop-blur-sm border-purple-500/20 chat-container">
      <div className="p-4 border-b border-purple-500/20">
        <h2 className="text-lg font-semibold text-purple-300">Chat with KIARA</h2>
      </div>

      <ScrollArea className="flex-grow px-4 py-2 min-h-0">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${msg.role === "user" ? "user" : ""}`}
            >
              {msg.content}
            </div>
          ))}
          {isTyping && (
            <div className="text-purple-400 animate-pulse">KIARA is thinking...</div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-purple-500/20">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask KIARA anything..."
            className="bg-gray-800/50 border-purple-500/20 flex-grow"
            disabled={isTyping}
          />
          <Button
            type="submit"
            className="bg-purple-500 hover:bg-purple-600 whitespace-nowrap"
            disabled={isTyping || !input.trim()}
          >
            Send Message
          </Button>
        </form>
      </div>
    </Card>
  );
}