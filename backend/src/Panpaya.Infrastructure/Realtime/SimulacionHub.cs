using Microsoft.AspNetCore.SignalR;
using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;

namespace Panpaya.Infrastructure.Realtime;

public sealed class SimulacionHub : Hub<ISimulacionClient>
{
    private readonly ISimulacionOrchestrator _orchestrator;

    public SimulacionHub(ISimulacionOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    public async Task<SimulacionIniciadaEvento?> IniciarSimulacion(SolicitudSimulacion solicitud)
    {
        try
        {
            return await _orchestrator.IniciarAsync(solicitud, Context.ConnectionId, Context.ConnectionAborted);
        }
        catch (Exception ex)
        {
            await Clients.Caller.ErrorSimulacion(new ErrorSimulacionEvento(
                null,
                "SIMULACION_FALLIDA",
                ex.Message,
                "Verifica que el origen, el destino y la ruta estén disponibles antes de iniciar la simulación."));
            return null;
        }
    }

    public Task PausarSimulacion(string simulacionId) =>
        _orchestrator.PausarAsync(simulacionId);

    public Task ReanudarSimulacion(string simulacionId) =>
        _orchestrator.ReanudarAsync(simulacionId);

    public Task CancelarSimulacion(string simulacionId) =>
        _orchestrator.CancelarAsync(simulacionId);

    public async Task<EnlaceEstadoEvento> SimularCaidaEnlace(string enlaceId)
    {
        var evento = await _orchestrator.SimularCaidaEnlaceAsync(enlaceId);
        await Clients.All.EstadoEnlaceCambiado(evento);
        return evento;
    }

    public async Task<EnlaceEstadoEvento> RestaurarEnlace(string enlaceId)
    {
        var evento = await _orchestrator.RestaurarEnlaceAsync(enlaceId);
        await Clients.All.EstadoEnlaceCambiado(evento);
        return evento;
    }

    public async Task<EstadoSimulacionEvento?> SolicitarEstado(string simulacionId)
    {
        try
        {
            var estado = await _orchestrator.ObtenerEstadoAsync(simulacionId);
            await Clients.Caller.EstadoSimulacion(estado);
            return estado;
        }
        catch (Exception ex)
        {
            await Clients.Caller.ErrorSimulacion(new ErrorSimulacionEvento(
                simulacionId,
                "ESTADO_NO_DISPONIBLE",
                ex.Message,
                "La simulación solicitada no existe o ya fue eliminada."));
            return null;
        }
    }
}
