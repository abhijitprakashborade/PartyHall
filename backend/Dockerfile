# Party Hall SaaS – Django Backend Dockerfile
# Python 3.11 slim + GDAL/GEOS system libs for PostGIS

FROM python:3.11-slim

# Install system deps for PostGIS (GDAL, GEOS, PROJ)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    binutils \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL env var for django.contrib.gis
ENV GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

COPY . .

EXPOSE 8000

# Daphne ASGI server: supports HTTP + WebSocket
# Runs migrate + collectstatic on every deploy, then starts the server
CMD sh -c "python manage.py migrate --noinput && python manage.py collectstatic --noinput && daphne -b 0.0.0.0 -p 8000 config.asgi:application"
