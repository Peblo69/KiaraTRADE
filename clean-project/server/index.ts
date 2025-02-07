const tryBind = async (retries = 5, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (server) {
        await new Promise<void>(resolve => server?.close(resolve));
      }

      server = registerRoutes(app);

      await new Promise<void>((resolve, reject) => {
        server?.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Attempt ${attempt}/${retries}: Port ${port} in use, retrying in ${delay/1000} seconds...`);
          } else {
            reject(err);
          }
        });

        server?.listen(port, '0.0.0.0', () => {
          console.log('\n🚀 Server Status:');
          console.log(`📡 Internal: Running on 0.0.0.0:${port}`);
          console.log(`🌍 External: Mapped to port 3000`);
          console.log(`⏰ Started at: ${new Date().toISOString()}`);
          console.log('\n✅ Server is ready to accept connections\n');
          resolve();
        });
      });

      return; // Success
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const port = process.env.PORT || 5000;