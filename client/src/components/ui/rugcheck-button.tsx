import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import axios from "axios";

interface RugcheckButtonProps {
  mint: string;
  onRiskUpdate?: (score: number) => void;
}

export function RugcheckButton({ mint, onRiskUpdate }: RugcheckButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskData, setRiskData] = useState<{
    score: number;
    risks: Array<{ name: string; description: string; level: string }>;
  } | null>(null);
  const lastCheckRef = useRef<number>(0);
  const cooldownPeriod = 10000; // 10 seconds

  const checkRisk = async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < cooldownPeriod) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      lastCheckRef.current = now;

      const response = await axios.get(`/api/rugcheck/${mint}`);
      setRiskData(response.data);
      onRiskUpdate?.(response.data.score);
    } catch (err) {
      setError("Failed to check risk");
      console.error("Rugcheck error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 200) return "text-green-500";
    if (score <= 500) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskIcon = (score: number) => {
    if (score <= 200) return "🛡️";
    if (score <= 500) return "⚠️";
    return "🚨";
  };

  const getRiskLevelEmoji = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            checkRisk();
          }}
          disabled={loading}
          className={`gap-2 ${
            riskData ? getRiskColor(riskData.score) : "text-gray-500"
          } transition-all duration-300 hover:scale-105 active:scale-95 relative overflow-hidden`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : riskData ? (
            <span className="text-lg">{getRiskIcon(riskData.score)}</span>
          ) : (
            <Shield className="w-4 h-4" />
          )}
          {riskData ? `Risk: ${riskData.score}` : "Check Risk"}
          {riskData && (
            <div 
              className={`absolute bottom-0 left-0 h-1 transition-all duration-500 ${
                riskData.score <= 200
                  ? "bg-green-500"
                  : riskData.score <= 500
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${(riskData.score / 1000) * 100}%` }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-black/95 border-purple-500/20 backdrop-blur-md">
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : riskData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getRiskIcon(riskData.score)}</span>
                <span className={`font-bold text-lg ${getRiskColor(riskData.score)}`}>
                  Risk Score: {riskData.score}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                style={{ width: `${(riskData.score / 1000) * 100}%` }}
              />
              <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1 text-[10px] text-white/70">
                <span>High Risk</span>
                <span>Low Risk</span>
              </div>
            </div>

            <div className="space-y-3 mt-2">
              {riskData.risks.map((risk, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg ${
                    risk.level === "high"
                      ? "bg-red-500/10 border border-red-500/20"
                      : risk.level === "medium"
                      ? "bg-yellow-500/10 border border-yellow-500/20"
                      : "bg-green-500/10 border border-green-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getRiskLevelEmoji(risk.level)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{risk.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          risk.level === "high"
                            ? "bg-red-500/20 text-red-400"
                            : risk.level === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          {risk.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {risk.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Click to check token risk score</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}