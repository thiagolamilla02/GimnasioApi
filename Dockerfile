# ---- Etapa 1: compilar ----
FROM eclipse-temurin:21-jdk AS compilacion
WORKDIR /app
COPY . .
# Se corrigen los saltos de linea de Windows y se da permiso de ejecucion al wrapper de Gradle
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew bootJar --no-daemon -x test

# ---- Etapa 2: ejecutar ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=compilacion /app/build/libs/*.jar app.jar
# Memoria ajustada para el plan gratuito
ENV JAVA_OPTS="-Xmx320m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]