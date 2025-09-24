import { app, startServer } from './server';

// Start the server
const server = startServer(app);

export { app, server };