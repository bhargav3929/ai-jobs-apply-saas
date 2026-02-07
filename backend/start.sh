#!/bin/bash
if [ "$SERVICE_TYPE" = "worker" ]; then
    echo "Starting Celery worker..."
    exec celery -A tasks.celery_app worker --loglevel=info --concurrency=2
else
    echo "Starting API server..."
    exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
fi
