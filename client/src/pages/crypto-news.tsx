import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Crypto News
            </h1>
            <div className="text-sm text-muted-foreground">
              Updates every 1.5 hours
            </div>
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
                  className="block group"
                >
                  <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    {article.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            console.log('[CryptoNews] Image load error:', article.image_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {article.text}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{article.source_name}</span>
                        <time dateTime={article.date}>
                          {new Date(article.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </time>
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
      </div>
    </Layout>
  );
}