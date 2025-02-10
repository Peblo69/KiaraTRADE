import express from "express";

const app = express();
const port = Number(process.env.PORT || 5000);

// Enable JSON parsing
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (_req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Basic error handling
app.use((err: Error, _req: any, res: any, next: any) => {
  console.error('Error occurred:', err);
  res.status(500).json({ error: 'Internal Server Error' });
  next(err);
});

// Start server with error handling
try {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Time: ${new Date().toISOString()}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}