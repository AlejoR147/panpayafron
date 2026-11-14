using Panpaya.Application.Simulacion;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Ports;

public interface ITopologyReader
{
    Topologia Obtener();
}

public interface ITopologyMutator
{
    bool CambiarEstadoEnlace(string enlaceId, EstadoEnlace estado);
}

public interface IRouteStrategy
{
    string Nombre { get; }
    RutaCalculada? Calcular(Topologia topologia, string origenId, string destinoId);
}

public interface ITrafficScenario
{
    TipoPaquete Tipo { get; }
    PlanSimulacion CrearPlan(
        Topologia topologia,
        SolicitudSimulacion solicitud,
        RutaCalculada ruta,
        string? nodoInicio = null,
        PaqueteSimulacion? paqueteExistente = null);
}

public interface IExplanationProvider
{
    string Explicar(PasoSimulacionContext contexto);
    string ExplicarRutaRecalculada(RutaCalculada anterior, RutaCalculada nueva, string motivo);
    string ExplicarEnlace(Enlace enlace, EstadoEnlace estado);
}

public interface ISimulationEventSink
{
    Task SimulacionIniciadaAsync(SimulacionIniciadaEvento evento, CancellationToken cancellationToken);
    Task PasoAsync(PasoSimulacion paso, CancellationToken cancellationToken);
    Task RutaRecalculadaAsync(RutaRecalculadaEvento evento, CancellationToken cancellationToken);
    Task EstadoEnlaceAsync(EnlaceEstadoEvento evento, CancellationToken cancellationToken);
    Task FinalizadaAsync(SimulacionFinalizadaEvento evento, CancellationToken cancellationToken);
    Task ErrorAsync(ErrorSimulacionEvento evento, CancellationToken cancellationToken);
    Task EstadoSimulacionAsync(EstadoSimulacionEvento evento, CancellationToken cancellationToken);
}

public interface ISimulationEventSinkFactory
{
    ISimulationEventSink Crear(string conexionId);
}

public interface ISimulationStore
{
    void Guardar(SimulacionActiva simulacion);
    SimulacionActiva? Obtener(string simulacionId);
    bool Eliminar(string simulacionId);
    IReadOnlyCollection<SimulacionActiva> ObtenerTodas();
}

public interface ISimulacionOrchestrator
{
    Task<SimulacionIniciadaEvento> IniciarAsync(
        SolicitudSimulacion solicitud,
        string conexionId,
        CancellationToken cancellationToken);

    Task PausarAsync(string simulacionId);
    Task ReanudarAsync(string simulacionId);
    Task CancelarAsync(string simulacionId);
    Task<EnlaceEstadoEvento> SimularCaidaEnlaceAsync(string enlaceId);
    Task<EnlaceEstadoEvento> RestaurarEnlaceAsync(string enlaceId);
    Task<EstadoSimulacionEvento> ObtenerEstadoAsync(string simulacionId);
}
