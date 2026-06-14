FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY clinicos_ai ./clinicos_ai
ENV PORT=8000
EXPOSE 8000
CMD ["python", "-m", "clinicos_ai.main"]
