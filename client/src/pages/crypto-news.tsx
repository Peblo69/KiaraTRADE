import { useEffect, useState } from 'react';
import { Loader2, ExternalLink, Clock } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

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

  useEffect(() => {
    fetchNews();
    // Refresh every 1.5 hours (5400000 milliseconds)
    const interval = setInterval(fetchNews, 5400000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Crypto News
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Auto-refreshes every 1.5 hours</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-[400px]">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {news.map((article, index) => (
              <a
                key={index}
                href={article.news_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {article.image_url && (
                      <div className="h-[400px] overflow-hidden relative">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            console.log('[CryptoNews] Image load error:', article.image_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span className="font-medium">{article.source_name}</span>
                          <time dateTime={article.date} className="flex items-center gap-2">
                            {new Date(article.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </time>
                        </div>
                        <h2 className="text-2xl font-bold mb-4 line-clamp-3 group-hover:text-primary transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground line-clamp-4">
                          {article.text}
                        </p>
                      </div>
                    </div>
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
    </Layout>
  );
}