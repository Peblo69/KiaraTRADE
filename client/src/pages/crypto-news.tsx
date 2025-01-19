import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface NewsArticle {
  title: string;
  text: string;
  news_url: string;
  source_name: string;
  date: string;
}

export default function CryptoNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/crypto-news');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setNews(data.articles || []);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Crypto News</h1>
      <div className="space-y-8">
        {news.map((article, index) => (
          <article 
            key={index} 
            className="border-b border-border pb-6 last:border-0"
          >
            <a
              href={article.news_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {article.title}
              </h2>
              <p className="text-muted-foreground mb-2">
                {article.text}
              </p>
              <div className="text-sm text-muted-foreground">
                {article.source_name} • {new Date(article.date).toLocaleDateString()}
              </div>
            </a>
          </article>
        ))}
        {news.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No news articles available at the moment.
          </p>
        )}
      </div>
    </div>
  );
}
