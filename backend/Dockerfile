FROM python:3.12-slim
WORKDIR /app
# PYTHONPATH lets the `alembic` command import the app package (it does not look in the current folder by itself).
ENV PYTHONPATH=/app PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Apply database migrations, then start the API. One process on purpose: the update-email scheduler runs inside it.
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
