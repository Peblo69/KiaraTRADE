import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    if (score <= 200) return <Shield className="w-4 h-4" />;
    if (score <= 500) return <AlertTriangle className="w-4 h-4" />;
    return <ShieldAlert className="w-4 h-4" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click event
              checkRisk();
            }}
            disabled={loading || Date.now() - lastCheckRef.current < cooldownPeriod}
            className={`gap-2 ${
              riskData ? getRiskColor(riskData.score) : "text-gray-500"
            } transition-all duration-300 hover:scale-105 active:scale-95`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : riskData ? (
              getRiskIcon(riskData.score)
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {riskData ? `Risk: ${riskData.score}` : "Check Risk"}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="w-72 p-4 bg-black/95 border-purple-500/20 backdrop-blur-md">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : riskData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className={`font-semibold ${getRiskColor(riskData.score)}`}>
                  Risk Score: {riskData.score}
                </p>
                <div className="text-xs text-gray-400">
                  Updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    riskData.score <= 200
                      ? "bg-green-500"
                      : riskData.score <= 500
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${(riskData.score / 1000) * 100}%` }}
                />
              </div>

              <div className="space-y-3 mt-4">
                {riskData.risks.map((risk, i) => (
                  <div 
                    key={i}
                    className={`p-2 rounded-lg ${
                      risk.level === "high"
                        ? "bg-red-500/10 border border-red-500/20"
                        : risk.level === "medium"
                        ? "bg-yellow-500/10 border border-yellow-500/20"
                        : "bg-green-500/10 border border-green-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{risk.name}</span>
                      <span 
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          risk.level === "high"
                            ? "bg-red-500/20 text-red-400"
                            : risk.level === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {risk.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Click to check token risk score</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}