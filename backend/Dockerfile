# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/Panpaya.Api/Panpaya.Api.csproj src/Panpaya.Api/
COPY src/Panpaya.Application/Panpaya.Application.csproj src/Panpaya.Application/
COPY src/Panpaya.Domain/Panpaya.Domain.csproj src/Panpaya.Domain/
COPY src/Panpaya.Infrastructure/Panpaya.Infrastructure.csproj src/Panpaya.Infrastructure/
COPY data/seed/topologia.json data/seed/topologia.json

RUN dotnet restore src/Panpaya.Api/Panpaya.Api.csproj

COPY . .
RUN dotnet publish src/Panpaya.Api/Panpaya.Api.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "Panpaya.Api.dll"]
