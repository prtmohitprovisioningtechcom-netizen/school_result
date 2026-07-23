// Entry point for Node.js environments (e.g. cPanel, Hostinger)
// Make sure to run 'npm run build' before using this file so the 'dist' directory is generated.

try {
  require('./dist/index.js');
} catch (err) {
  console.error("Failed to start server. Please ensure you have run 'npm run build' first.");
  console.error(err);
  process.exit(1);
}
