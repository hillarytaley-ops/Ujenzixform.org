# Site vision worker — run on any host with Docker (Linux server, mini PC, WSL2).
# Build:  docker build -t ujenzi-site-vision .
# Run:    docker run --env-file .env --restart unless-stopped ujenzi-site-vision
#
# Copy .env from .env.example and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

FROM python:3.12-slim-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV PYTHONUNBUFFERED=1

CMD ["python", "-u", "main.py"]
