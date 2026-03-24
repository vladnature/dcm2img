FROM nginx:alpine
COPY dicom-viewer.html /usr/share/nginx/html/index.html
EXPOSE 80
