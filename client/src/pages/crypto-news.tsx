import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface NewsArticle {
  title: string;
  text: string;
  news_url: string;
  source_name: string;
  date: string;
}

// Mock data for initial display
const mockNews: NewsArticle[] = [
  {
    title: "Bitcoin Surpasses Previous All-Time High",
    text: "The world's largest cryptocurrency has reached new heights, surpassing its previous record as institutional adoption continues to grow.",
    news_url: "https://example.com/bitcoin-ath",
    source_name: "Crypto Daily",
    date: new Date().toISOString()
  },
  {
    title: "Major Bank Announces Crypto Trading Services",
    text: "A leading financial institution has announced plans to offer cryptocurrency trading services to its retail clients, marking another milestone in mainstream adoption.",
    news_url: "https://example.com/bank-crypto",
    source_name: "Financial News",
    date: new Date(Date.now() - 3600000).toISOString()
  },
  {
    title: "New Blockchain Platform Promises Enhanced Scalability",
    text: "A newly launched blockchain platform claims to solve the scalability trilemma while maintaining decentralization and security.",
    news_url: "https://example.com/blockchain-scale",
    source_name: "Tech Insider",
    date: new Date(Date.now() - 7200000).toISOString()
  }
];

export default function CryptoNews() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // First try to fetch from the API
        const response = await fetch('/api/crypto-news');
        if (response.ok) {
          const data = await response.json();
          setNews(data.articles || []);
        } else {
          // If API fails, use mock data
          setNews(mockNews);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        // Use mock data as fallback
        setNews(mockNews);
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