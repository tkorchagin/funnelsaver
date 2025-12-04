from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

celery_app = Celery(
    'funnelsaver',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_concurrency=2,  # Maximum 2 parallel workers
    worker_prefetch_multiplier=1,  # Fetch one task at a time

    # Broker connection settings for stability
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    broker_pool_limit=10,

    # Redis health check settings
    broker_transport_options={
        'visibility_timeout': 43200,  # 12 hours
        'health_check_interval': 30,  # Check connection every 30 seconds
    },

    # Result backend settings
    result_backend_transport_options={
        'retry_policy': {
            'timeout': 5.0
        }
    },
)
