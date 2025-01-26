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
            onClick={checkRisk}
            disabled={loading || Date.now() - lastCheckRef.current < cooldownPeriod}
            className={`gap-2 ${
              riskData ? getRiskColor(riskData.score) : "text-gray-500"
            }`}
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
        <TooltipContent>
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : riskData ? (
            <div className="space-y-2">
              <p className={`font-semibold ${getRiskColor(riskData.score)}`}>
                Risk Score: {riskData.score}
              </p>
              {riskData.risks.map((risk, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{risk.name}:</span>
                  <p className="text-gray-400">{risk.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Click to check token risk score</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
