# Build context is the repo root (not backend/), so this can COPY the
# runs/ and cache/ directories the app reads from at ../runs and ../cache
# relative to backend/app/. See app/config.py.
FROM python:3.10-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY backend/requirements-cpu.txt ./requirements-cpu.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements-cpu.txt

COPY backend/app ./backend/app
COPY runs/tft_fastf1.ckpt ./runs/tft_fastf1.ckpt
COPY cache ./cache

WORKDIR /srv/backend
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
