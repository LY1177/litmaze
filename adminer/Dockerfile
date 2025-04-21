FROM adminer:latest

# Make Render's $PORT available and expose it
ENV PORT $PORT
EXPOSE $PORT

# Start PHP's built‑in server on that port
CMD ["php", "-S", "0.0.0.0:$PORT", "-t", "/var/www/html"]

