# Optional: run the World Cup Hub in a container.
#   docker build -t worldcup .
#   docker run --rm -p 8080:8080 worldcup
# then open http://localhost:8080/worldcup/
FROM python:3-alpine
WORKDIR /app
COPY . /app
EXPOSE 8080
CMD ["python", "-m", "http.server", "8080"]
