const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';
  }

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    err.details = Object.values(err.errors).map((e) => ({
      field: e.path,
      msg: e.message,
    }));
  }

  if (statusCode >= 500) {
    console.error(`[error] ${statusCode}: ${message}`);
    message = 'Internal server error';
  }

  const body = { status: 'error', message };
  if (err.details && statusCode < 500) {
    body.errors = err.details;
  }

  res.status(statusCode).json(body);
};

export { notFoundHandler, errorHandler };
