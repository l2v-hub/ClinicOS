import app from './app.js';

const DEFAULT_PORT = 3001;

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const port = process.env.PORT || 3001;

const server = app.listen(port, () => {
  console.log(`ClinicOS backend listening on port ${port}`);
});

server.on('error', (error) => {
  console.error('Failed to start ClinicOS backend:', error);
  process.exit(1);
});
