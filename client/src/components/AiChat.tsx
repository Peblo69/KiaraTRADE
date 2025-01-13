import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! I am KIARA, your AI assistant. How can I help you today?"
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response - In a real implementation, this would be connected to your AI backend
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I understand. How can I assist you further with that?"
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <Card className="flex flex-col h-[400px] backdrop-blur-sm bg-purple-900/10 border-purple-500/20">
      <div className="p-4 border-b border-purple-500/20">
        <h2 className="text-lg font-semibold text-purple-300">Chat with KIARA</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-purple-500/20 ml-auto max-w-[80%]"
                : "bg-gray-800/50 mr-auto max-w-[80%]"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isTyping && (
          <div className="text-purple-400 animate-pulse">KIARA is thinking...</div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-purple-500/20">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask KIARA anything..."
            className="bg-gray-800/50"
          />
          <Button
            onClick={sendMessage}
            className="bg-purple-500 hover:bg-purple-600 whitespace-nowrap"
          >
            Send Message
          </Button>
        </div>
      </div>
    </Card>
  );
}