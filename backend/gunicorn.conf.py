import os

bind = "0.0.0.0:8000"
workers = int(os.environ.get("WEB_CONCURRENCY", 4))
worker_class = "uvicorn_worker.UvicornWorker"

reuse_port = True

timeout = 30
graceful_timeout = 15
keepalive = 5

accesslog = None
forwarded_allow_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1")
