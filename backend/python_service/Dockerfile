# base image
FROM python:3.10-slim

# env vars
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# system deps for opencv
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# app folder
WORKDIR /app

# install deps
COPY requirements.txt .

# install python libs
RUN pip install --no-cache-dir -r requirements.txt

# copy code
COPY . .

# hf spaces port
EXPOSE 7860

# run server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
