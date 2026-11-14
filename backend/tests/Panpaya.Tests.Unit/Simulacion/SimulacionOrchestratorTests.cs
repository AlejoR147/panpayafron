using Panpaya.Application.Ports;
using Panpaya.Application.Simulacion;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;
using Panpaya.Infrastructure.Explanations;
using Panpaya.Infrastructure.Persistence;
using Panpaya.Infrastructure.Routing;
using Panpaya.Infrastructure.Simulation;

namespace Panpaya.Tests.Unit.Simulacion;

public sealed class SimulacionOrchestratorTests
{
    [Fact]
    public async Task IniciarAsync_CompletaSimulacionYEmitePasos()
    {
        var (orchestrator, sink) = CrearOrquestador();

        await orchestrator.IniciarAsync(
            new SolicitudSimulacion("pc-med-admin-01", "srv-bog-erp-01", Velocidad: 4, SimularRespuesta: false),
            "conexion-prueba",
            CancellationToken.None);

        var final = await sink.FinalizadaTcs.Task.WaitAsync(TimeSpan.FromSeconds(15));

        Assert.True(final.Exito);
        Assert.NotEmpty(sink.Pasos);
        Assert.Contains(sink.Pasos, p => p.TipoEvento == TipoEventoPaso.Wan);
        Assert.Empty(sink.Errores);
    }

    [Fact]
    public async Task SimularCaidaEnlace_RecalculaRutaPorCali()
    {
        var (orchestrator, sink) = CrearOrquestador();

        await orchestrator.IniciarAsync(
            new SolicitudSimulacion("pc-med-admin-01", "srv-bog-erp-01", Velocidad: 4, SimularRespuesta: false),
            "conexion-prueba",
            CancellationToken.None);

        await Task.Delay(250);
        await orchestrator.SimularCaidaEnlaceAsync("wan-bog-med");

        var final = await sink.FinalizadaTcs.Task.WaitAsync(TimeSpan.FromSeconds(15));

        Assert.True(final.Exito);
        Assert.NotEmpty(sink.Rutas);
        Assert.Contains("rtr-cal", sink.Rutas[0].RutaNueva);
        Assert.Contains(sink.Pasos, p => p.NodoActual == "rtr-cal");
    }

    private static (SimulacionOrchestrator Orquestador, SinkPrueba Sink) CrearOrquestador()
    {
        var rutaSeed = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "data", "seed", "topologia.json");

        var repositorio = new JsonTopologiaRepository(rutaSeed);
        var sink = new SinkPrueba();
        var orquestador = new SimulacionOrchestrator(
            repositorio,
            repositorio,
            new RipV2RouteStrategy(),
            new[] { new PingScenario(new TemplateExplanationProvider()) },
            new TemplateExplanationProvider(),
            new InMemorySimulationStore(),
            new FabricaSinkPrueba(sink));

        return (orquestador, sink);
    }

    private sealed class FabricaSinkPrueba : ISimulationEventSinkFactory
    {
        private readonly SinkPrueba _sink;

        public FabricaSinkPrueba(SinkPrueba sink)
        {
            _sink = sink;
        }

        public ISimulationEventSink Crear(string conexionId) => _sink;
    }

    private sealed class SinkPrueba : ISimulationEventSink
    {
        public List<PasoSimulacion> Pasos { get; } = new();
        public List<RutaRecalculadaEvento> Rutas { get; } = new();
        public List<ErrorSimulacionEvento> Errores { get; } = new();
        public TaskCompletionSource<SimulacionFinalizadaEvento> FinalizadaTcs { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task SimulacionIniciadaAsync(SimulacionIniciadaEvento evento, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task PasoAsync(PasoSimulacion paso, CancellationToken cancellationToken)
        {
            Pasos.Add(paso);
            return Task.CompletedTask;
        }

        public Task RutaRecalculadaAsync(RutaRecalculadaEvento evento, CancellationToken cancellationToken)
        {
            Rutas.Add(evento);
            return Task.CompletedTask;
        }

        public Task EstadoEnlaceAsync(EnlaceEstadoEvento evento, CancellationToken cancellationToken) =>
            Task.CompletedTask;

        public Task FinalizadaAsync(SimulacionFinalizadaEvento evento, CancellationToken cancellationToken)
        {
            FinalizadaTcs.TrySetResult(evento);
            return Task.CompletedTask;
        }

        public Task ErrorAsync(ErrorSimulacionEvento evento, CancellationToken cancellationToken)
        {
            Errores.Add(evento);
            return Task.CompletedTask;
        }

        public Task EstadoSimulacionAsync(EstadoSimulacionEvento evento, CancellationToken cancellationToken) =>
            Task.CompletedTask;
    }
}
