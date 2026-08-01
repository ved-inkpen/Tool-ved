FROM python:3.11-slim

WORKDIR /app

# emergentintegrations is pinned in requirements.txt but is not on PyPI and is
# imported nowhere, so a clean install fails without stripping it.
COPY requirements.txt .
RUN grep -v '^emergentintegrations' requirements.txt > /tmp/requirements.txt \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

# uploads land here; compose mounts a volume so they survive a container restart
RUN mkdir -p /app/uploads

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
