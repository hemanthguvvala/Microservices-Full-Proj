# =============================================================================
# Multi-stage Docker Build — Employee Microservice
# Supports both JAR (default) and WAR packaging
#
# Interview: "Multi-stage build reduces image size from ~800MB to ~250MB.
#   Stage 1 uses Maven+JDK for compilation. Stage 2 copies only the JAR
#   into a JRE-Alpine image. Non-root user, HEALTHCHECK, cgroup-aware JVM."
#
# Build commands:
#   docker build -t employee-service .                              # JAR (default)
#   docker build --build-arg PACKAGING=war -t employee-service .    # WAR + Tomcat
# =============================================================================

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM maven:3.8.7-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Build argument: jar (default) or war
ARG PACKAGING=jar
ARG MAVEN_PROFILE=""

# Copy pom.xml first — Docker layer caching for dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build with appropriate profile
COPY src ./src
RUN if [ "$PACKAGING" = "war" ]; then \
        mvn clean package -DskipTests -Pwar-packaging -B; \
    else \
        mvn clean package -DskipTests -B; \
    fi

# ── Stage 2a: JAR Runtime (default) ────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS jar-runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (Employee service runs on 8081)
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# JVM tuning for containers
# -XX:+UseContainerSupport: respect cgroup memory limits
# -XX:MaxRAMPercentage=75.0: use 75% of container memory for heap
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

# ── Stage 2b: WAR Runtime (external Tomcat) ─────────────────────────────────
FROM tomcat:10.1-jre17-temurin AS war-runtime
WORKDIR /usr/local/tomcat

# Remove default webapps for security
RUN rm -rf webapps/*

# Copy WAR from build stage → Tomcat's webapps directory
COPY --from=build /app/target/*.war webapps/employee-service.war

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl --fail http://localhost:8080/employee-service/actuator/health || exit 1

# ── Final stage selection ───────────────────────────────────────────────────
# Default target is jar-runtime. Override with:
#   docker build --target war-runtime -t employee-service:war .

