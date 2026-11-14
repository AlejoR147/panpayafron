using Microsoft.AspNetCore.SignalR;
using Panpaya.Application.Ports;

namespace Panpaya.Infrastructure.Realtime;

public sealed class SignalRSimulationEventSinkFactory : ISimulationEventSinkFactory
{
    private readonly IHubContext<SimulacionHub, ISimulacionClient> _hub;

    public SignalRSimulationEventSinkFactory(IHubContext<SimulacionHub, ISimulacionClient> hub)
    {
        _hub = hub;
    }

    public ISimulationEventSink Crear(string conexionId) =>
        new SignalRSimulationEventSink(_hub, conexionId);
}
