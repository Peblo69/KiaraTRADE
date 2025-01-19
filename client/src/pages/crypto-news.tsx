import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredNews = searchQuery
    ? news.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : news;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6 mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Crypto News
        </h1>

        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400 transition-colors group-hover:text-purple-300" />
            <Input
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-purple-800/40 focus:border-purple-600/60 transition-all duration-300 backdrop-blur-sm rounded-lg shadow-[0_0_10px_rgba(147,51,234,0.1)] focus:shadow-[0_0_15px_rgba(147,51,234,0.2)] group-hover:shadow-[0_0_12px_rgba(147,51,234,0.15)] placeholder:text-purple-300/50"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
          <div className="text-sm text-purple-300/70">
            Updates every 1.5 hours
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden border-purple-800/20 bg-background/80 backdrop-blur-sm">
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
          {filteredNews.map((article, index) => (
            <a
              key={index}
              href={article.news_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="overflow-hidden h-full border-purple-800/20 bg-background/80 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(147,51,234,0.1)] hover:border-purple-700/30 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
                <div className="p-4 relative">
                  <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-purple-300/70 mb-4 line-clamp-3">
                    {article.text}
                  </p>
                  <div className="flex items-center justify-between text-sm text-purple-300/50">
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

      {!loading && filteredNews.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-purple-300/70">
            No news articles found
          </h3>
          <p className="text-purple-300/50 mt-2">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  );
}