FROM nginx:stable-alpine
COPY proxy.conf /etc/nginx/conf.d/proxy.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

