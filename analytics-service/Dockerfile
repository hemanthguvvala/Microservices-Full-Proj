FROM eclipse-temurin:21-jre-alpine AS base

# Build stage: compile + generate proto stubs
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
# protobuf plugin needs OS detection (os-maven-plugin)
RUN apk add --no-cache wget && \
    wget -q https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz && \
    tar -xzf apache-maven-3.9.6-bin.tar.gz && \
    ./apache-maven-3.9.6/bin/mvn package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Add non-root user for security
RUN addgroup -S analytics && adduser -S analytics -G analytics
USER analytics

COPY --from=build /build/target/analytics-service-*.jar app.jar

# HTTP actuator port
EXPOSE 8085
# gRPC port — must expose separately since gRPC uses HTTP/2 on its own port
EXPOSE 9090

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
