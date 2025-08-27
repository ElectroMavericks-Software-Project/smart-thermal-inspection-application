# Use OpenJDK 17 as base image
FROM openjdk:17-jdk-alpine

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY mvnw .
COPY mvnw.cmd .
COPY .mvn .mvn
COPY pom.xml .

# Make mvnw executable
RUN chmod +x ./mvnw

# Download dependencies (for better caching)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN ./mvnw clean package -DskipTests

# Create media directory for file uploads
RUN mkdir -p /app/media/baseline /app/media/inspections

# Expose port
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "target/sti-backend-0.0.1-SNAPSHOT.jar"]
