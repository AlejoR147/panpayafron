using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Panpaya.Application.Contratos;
using Panpaya.Application.Ports;
using Panpaya.Application.Simulacion;
using Panpaya.Infrastructure.Explanations;
using Panpaya.Infrastructure.Persistence;
using Panpaya.Infrastructure.Realtime;
using Panpaya.Infrastructure.Routing;
using Panpaya.Infrastructure.Simulation;

var builder = WebApplication.CreateBuilder(args);

var origenesCors = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (origenesCors is null || origenesCors.Length == 0)
{
    origenesCors = new[] { "http://localhost:5173", "http://localhost:3000" };
}
var puerto = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(puerto))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{puerto}");
}

builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(origenesCors)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSignalR().AddJsonProtocol(options =>
    options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var rutaConfigurada = builder.Configuration["Topologia:SeedPath"];
var rutaBase = string.IsNullOrWhiteSpace(rutaConfigurada) || !Path.IsPathRooted(rutaConfigurada)
    ? Path.Combine(builder.Environment.ContentRootPath, rutaConfigurada ?? "../../data/seed/topologia.json")
    : rutaConfigurada;
var rutaFallbackRelativo = Path.Combine(builder.Environment.ContentRootPath, "data", "seed", "topologia.json");
var rutaFallbackAbsoluto = Path.Combine(AppContext.BaseDirectory, "data", "seed", "topologia.json");
var rutaFinal = File.Exists(rutaBase) ? rutaBase : (File.Exists(rutaFallbackRelativo) ? rutaFallbackRelativo : (File.Exists(rutaFallbackAbsoluto) ? rutaFallbackAbsoluto : rutaBase));

var jsonTopologiaRepository = new JsonTopologiaRepository(rutaFinal);
builder.Services.AddSingleton<ITopologyReader>(jsonTopologiaRepository);
builder.Services.AddSingleton<ITopologyMutator>(jsonTopologiaRepository);
builder.Services.AddSingleton<ITopologiaQueryService, TopologiaQueryService>();
builder.Services.AddSingleton<IRouteStrategy, RipV2RouteStrategy>();
builder.Services.AddSingleton<IExplanationProvider, TemplateExplanationProvider>();
builder.Services.AddSingleton<ITrafficScenario, PingScenario>();
builder.Services.AddSingleton<ISimulationStore, InMemorySimulationStore>();
builder.Services.AddSingleton<ISimulationEventSinkFactory, SignalRSimulationEventSinkFactory>();
builder.Services.AddSingleton<ISimulacionOrchestrator, SimulacionOrchestrator>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.MapControllers();
app.MapHub<SimulacionHub>("/hubs/simulacion");

app.Run();
