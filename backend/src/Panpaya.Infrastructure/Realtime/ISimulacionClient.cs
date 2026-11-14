using Panpaya.Domain.Simulacion;

namespace Panpaya.Infrastructure.Realtime;

public interface ISimulacionClient
{
    Task SimulacionIniciada(SimulacionIniciadaEvento evento);
    Task PasoSimulacion(PasoSimulacion paso);
    Task RutaRecalculada(RutaRecalculadaEvento evento);
    Task EstadoEnlaceCambiado(EnlaceEstadoEvento evento);
    Task SimulacionFinalizada(SimulacionFinalizadaEvento evento);
    Task ErrorSimulacion(ErrorSimulacionEvento evento);
    Task EstadoSimulacion(EstadoSimulacionEvento evento);
}
