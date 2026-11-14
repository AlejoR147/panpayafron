using Microsoft.AspNetCore.SignalR;
using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;

namespace Panpaya.Infrastructure.Realtime;

public sealed class SignalRSimulationEventSink : ISimulationEventSink
{
    private readonly IHubContext<SimulacionHub, ISimulacionClient> _hub;
    private readonly string _conexionId;

    public SignalRSimulationEventSink(
        IHubContext<SimulacionHub, ISimulacionClient> hub,
        string conexionId)
    {
        _hub = hub;
        _conexionId = conexionId;
    }

    public Task SimulacionIniciadaAsync(SimulacionIniciadaEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).SimulacionIniciada(evento);

    public Task PasoAsync(PasoSimulacion paso, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).PasoSimulacion(paso);

    public Task RutaRecalculadaAsync(RutaRecalculadaEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).RutaRecalculada(evento);

    public Task EstadoEnlaceAsync(EnlaceEstadoEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).EstadoEnlaceCambiado(evento);

    public Task FinalizadaAsync(SimulacionFinalizadaEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).SimulacionFinalizada(evento);

    public Task ErrorAsync(ErrorSimulacionEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).ErrorSimulacion(evento);

    public Task EstadoSimulacionAsync(EstadoSimulacionEvento evento, CancellationToken cancellationToken) =>
        _hub.Clients.Client(_conexionId).EstadoSimulacion(evento);
}
