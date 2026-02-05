import platform
import logging
from celery import Celery
from celery.signals import worker_ready, task_prerun, task_postrun, task_failure, task_received
from core.settings import REDIS_URL

logger = logging.getLogger("celery_app")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

logger.info(f"Initializing Celery with broker={REDIS_URL}")

celery_app = Celery('tasks', broker=REDIS_URL, backend=REDIS_URL, include=['tasks.email_tasks'])

# Use 'solo' pool on macOS to avoid fork + gRPC/Firebase reinitialization delays.
# On Linux (production), prefork is fine.
worker_pool = 'solo' if platform.system() == 'Darwin' else 'prefork'
logger.info(f"Platform: {platform.system()}, worker_pool: {worker_pool}")

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_pool=worker_pool,
    worker_prefetch_multiplier=1,
)

@worker_ready.connect
def on_worker_ready(**kwargs):
    logger.info("=== CELERY WORKER IS READY AND ACCEPTING TASKS ===")

@task_received.connect
def on_task_received(request, **kwargs):
    logger.info(f"TASK RECEIVED: {request.name} id={request.id} args={request.args}")

@task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **kw):
    logger.info(f"TASK STARTING: {task.name} id={task_id} args={args}")

@task_postrun.connect
def on_task_postrun(task_id, task, args, kwargs, retval, state, **kw):
    logger.info(f"TASK FINISHED: {task.name} id={task_id} state={state} result={retval}")

@task_failure.connect
def on_task_failure(task_id, exception, args, kwargs, traceback, **kw):
    logger.error(f"TASK FAILED: id={task_id} exception={exception} args={args}")
