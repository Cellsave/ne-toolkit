# Network Engineers Toolkit - Frontend Dockerfile
# Nginx with static files

FROM nginx:alpine

# Set maintainer
LABEL maintainer="Network Engineers Toolkit Team"
LABEL description="Frontend static files for Network Engineers Toolkit"

# Remove default nginx config and website
RUN rm /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files
COPY . /usr/share/nginx/html/

# Create required directories
RUN mkdir -p /usr/share/nginx/html/assets/css \
    /usr/share/nginx/html/assets/js \
    /usr/share/nginx/html/assets/icons \
    /usr/share/nginx/html/assets/screenshots

# Set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
