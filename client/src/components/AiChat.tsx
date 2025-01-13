import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! I am KIARA, your AI assistant. How can I help you with cryptocurrency analysis today?"
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Filter out the initial greeting message when sending history
      const chatHistory = messages.slice(1);
      const response = await axios.post("/api/chat", { 
        message: input,
        history: chatHistory
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.response
      }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, I encountered an error processing your request. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Card className="flex flex-col h-full bg-purple-900/10 border-purple-500/20">
      <div className="p-4 border-b border-purple-500/20">
        <h2 className="text-lg font-semibold text-purple-300">Chat with KIARA</h2>
      </div>

      <ScrollArea className="flex-grow px-4 py-2 min-h-0">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
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
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-purple-500/20">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask KIARA anything..."
            className="bg-gray-800/50 border-purple-500/20 flex-grow"
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