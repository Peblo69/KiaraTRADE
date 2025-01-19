import { useEffect, useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface NewsArticle {
  title: string;
  text: string;
  news_url: string;
  source_name: string;
  date: string;
  image_url?: string;
}

export default function CryptoNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('[CryptoNews] Fetching news...');
        const response = await fetch('/api/crypto-news');
        console.log('[CryptoNews] API Response status:', response.status);

        const data = await response.json();
        console.log('[CryptoNews] Received news data:', {
          success: response.ok,
          articleCount: data.articles?.length || 0
        });

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch news');
        }

        setNews(data.articles || []);
      } catch (error: any) {
        console.error('[CryptoNews] Error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load news articles"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Crypto News
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-video">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((article, index) => (
              <a
                key={index}
                href={article.news_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  {article.image_url && (
                    <div className="w-full h-12 flex items-center justify-center p-2 bg-background border-b">
                      <img
                        src={article.image_url}
                        alt={article.source_name}
                        className="h-full w-auto object-contain"
                        onError={(e) => {
                          console.log('[CryptoNews] Image load error:', article.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>{article.source_name}</span>
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-auto">
                      {article.text}
                    </p>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}

        {!loading && news.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-muted-foreground">
              No news articles available at the moment
            </h3>
            <p className="text-muted-foreground mt-2">
              Please check back later for updates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}