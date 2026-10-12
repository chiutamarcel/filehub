FROM openjdk:17-alpine
# Set the working directory in the container
WORKDIR /app

# Copy the built JAR file from the previous stage to the container
# COPY -from=build /app/target/filehub.jar .
COPY target/filehub.jar .

# Set the command to run the application
ENTRYPOINT  ["java", "-jar", "filehub.jar", "--spring.profiles.active=prod"]