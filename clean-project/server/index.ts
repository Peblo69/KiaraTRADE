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
          console.log(`🚀 Server running on port ${port}`);
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