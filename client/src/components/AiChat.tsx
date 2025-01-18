import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { nanoid } from 'nanoid';

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Greetings, crypto explorer! 🚀 I'm KIARA, your AI companion in the world of digital assets. Ready to dive into some exciting analysis? ✨"
  }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => nanoid());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await axios.post("/api/chat", { 
        message: input,
        sessionId
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
    <Card className="flex flex-col h-full bg-gradient-to-br from-black/60 via-purple-900/20 to-black/60 backdrop-blur-lg border-purple-500/30 shadow-lg shadow-purple-500/10">
      <div className="p-4 border-b border-purple-500/30 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              KIARA AI
            </h2>
            <p className="text-xs text-purple-300/80">Your Crypto Intelligence Assistant</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-grow px-4 py-2 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`group transition-all duration-300 ease-in-out ${
                msg.role === "user"
                  ? "ml-auto max-w-[80%]"
                  : "mr-auto max-w-[80%] flex gap-3 items-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
              )}
              <div
                className={`p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/20 text-white"
                    : "bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-purple-300/10 text-purple-50"
                } shadow-lg transition-all duration-300 ease-in-out hover:shadow-purple-500/5`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 items-start mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-purple-300/10 text-purple-50">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <span className="text-purple-400">KIARA is composing a response...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-purple-500/30 bg-black/40">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask KIARA anything..."
            className="bg-gray-900/50 border-purple-500/30 focus:border-purple-400 focus:ring-purple-400/20 text-purple-50 placeholder-purple-300/50"
          />
          <Button
            onClick={sendMessage}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold px-6 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/25"
          >
            Send 💫
          </Button>
        </div>
      </div>
    </Card>
  );
}