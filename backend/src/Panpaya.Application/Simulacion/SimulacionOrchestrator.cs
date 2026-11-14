using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Simulacion;

public sealed class SimulacionOrchestrator : ISimulacionOrchestrator
{
    private readonly ITopologyReader _reader;
    private readonly ITopologyMutator _mutator;
    private readonly IRouteStrategy _routeStrategy;
    private readonly IEnumerable<ITrafficScenario> _escenarios;
    private readonly IExplanationProvider _explicaciones;
    private readonly ISimulationStore _store;
    private readonly ISimulationEventSinkFactory _sinkFactory;

    public SimulacionOrchestrator(
        ITopologyReader reader,
        ITopologyMutator mutator,
        IRouteStrategy routeStrategy,
        IEnumerable<ITrafficScenario> escenarios,
        IExplanationProvider explicaciones,
        ISimulationStore store,
        ISimulationEventSinkFactory sinkFactory)
    {
        _reader = reader;
        _mutator = mutator;
        _routeStrategy = routeStrategy;
        _escenarios = escenarios;
        _explicaciones = explicaciones;
        _store = store;
        _sinkFactory = sinkFactory;
    }

    public Task<SimulacionIniciadaEvento> IniciarAsync(
        SolicitudSimulacion solicitud,
        string conexionId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var topologia = _reader.Obtener();
        var origen = topologia.BuscarDispositivo(solicitud.OrigenId)
            ?? throw new InvalidOperationException($"No existe el dispositivo origen '{solicitud.OrigenId}'.");
        var destino = topologia.BuscarDispositivo(solicitud.DestinoId)
            ?? throw new InvalidOperationException($"No existe el dispositivo destino '{solicitud.DestinoId}'.");

        var ruta = _routeStrategy.Calcular(topologia, origen.Id, destino.Id)
            ?? throw new InvalidOperationException("No existe una ruta RIPv2 activa entre el origen y el destino.");

        var escenario = _escenarios.FirstOrDefault(e => e.Tipo == solicitud.Tipo)
            ?? throw new InvalidOperationException($"No hay un escenario registrado para el tipo de paquete {solicitud.Tipo}.");

        var plan = escenario.CrearPlan(topologia, solicitud, ruta);
        var simulacionId = plan.Paquete.SimulacionId;
        var simulacion = new SimulacionActiva(simulacionId, solicitud, conexionId, plan, plan.Paquete);

        _store.Guardar(simulacion);
        var sink = _sinkFactory.Crear(conexionId);
        _ = Task.Run(() => EjecutarAsync(simulacion, escenario, sink), CancellationToken.None);

        return Task.FromResult(new SimulacionIniciadaEvento(
            simulacionId,
            plan.Paquete,
            ruta.Nodos,
            plan.Pasos.Count,
            $"Simulación {solicitud.Tipo} iniciada con ruta RIPv2 de métrica {ruta.Costo}."));
    }

    public Task PausarAsync(string simulacionId)
    {
        var simulacion = ObtenerSimulacion(simulacionId);
        simulacion.Pausar();
        return Task.CompletedTask;
    }

    public Task ReanudarAsync(string simulacionId)
    {
        var simulacion = ObtenerSimulacion(simulacionId);
        simulacion.Reanudar();
        return Task.CompletedTask;
    }

    public Task CancelarAsync(string simulacionId)
    {
        var simulacion = ObtenerSimulacion(simulacionId);
        simulacion.Cancelacion.Cancel();
        return Task.CompletedTask;
    }

    public Task<EnlaceEstadoEvento> SimularCaidaEnlaceAsync(string enlaceId) =>
        CambiarEstadoEnlaceAsync(enlaceId, EstadoEnlace.Caido);

    public Task<EnlaceEstadoEvento> RestaurarEnlaceAsync(string enlaceId) =>
        CambiarEstadoEnlaceAsync(enlaceId, EstadoEnlace.Activo);

    public Task<EstadoSimulacionEvento> ObtenerEstadoAsync(string simulacionId)
    {
        var simulacion = ObtenerSimulacion(simulacionId);
        var historial = simulacion.Historial;
        var pasoActual = historial.LastOrDefault();
        var enlaces = _reader.Obtener().Enlaces
            .Select(e => new EnlaceEstadoEvento(
                e.Id,
                e.OrigenId,
                e.DestinoId,
                e.Estado,
                _explicaciones.ExplicarEnlace(e, e.Estado)))
            .ToList();

        return Task.FromResult(new EstadoSimulacionEvento(
            simulacion.SimulacionId,
            simulacion.Paquete,
            pasoActual,
            historial,
            enlaces,
            simulacion.Finalizada));
    }

    private async Task EjecutarAsync(
        SimulacionActiva simulacion,
        ITrafficScenario escenario,
        ISimulationEventSink sink)
    {
        var cancellationToken = simulacion.Cancelacion.Token;

        try
        {
            await sink.SimulacionIniciadaAsync(
                new SimulacionIniciadaEvento(
                    simulacion.SimulacionId,
                    simulacion.Paquete,
                    simulacion.Plan.Ruta.Nodos,
                    simulacion.Plan.Pasos.Count,
                    "Simulación iniciada. El paquete comienza su recorrido."),
                cancellationToken);

            var plan = simulacion.Plan;
            var indice = 0;
            var secuencia = 0;
            var numeroPaso = 0;

            while (indice < plan.Pasos.Count)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await simulacion.EsperarSiPausadaAsync(cancellationToken);

                var paso = plan.Pasos[indice];
                var topologia = _reader.Obtener();
                var enlace = topologia.ObtenerEnlaceEntre(paso.NodoActual, paso.SiguienteSalto);

                if (enlace is null || enlace.Estado == EstadoEnlace.Caido)
                {
                    if (paso.TipoEvento == TipoEventoPaso.Respuesta)
                    {
                        var pasoErrorRespuesta = paso with
                        {
                            Estado = EstadoPaso.Descartado,
                            TipoEvento = TipoEventoPaso.Error,
                            ExplicacionDidactica = "La respuesta ICMP no pudo continuar porque un enlace de retorno dejó de estar disponible.",
                            DetalleTecnico = "RIPv2 no pudo sostener la ruta inversa durante la respuesta.",
                            RutaRestante = Array.Empty<string>(),
                            DuracionMs = 1200
                        };

                        numeroPaso++;
                        var errorRespuesta = pasoErrorRespuesta with
                        {
                            Secuencia = ++secuencia,
                            NumeroPaso = numeroPaso,
                            TotalPasos = numeroPaso
                        };

                        simulacion.AgregarPaso(errorRespuesta);
                        await sink.PasoAsync(errorRespuesta, cancellationToken);
                        await FinalizarFalloAsync(simulacion, sink, "Enlace de retorno no disponible");
                        return;
                    }

                    var rutaNueva = _routeStrategy.Calcular(topologia, paso.NodoActual, simulacion.Solicitud.DestinoId);
                    if (rutaNueva is null)
                    {
                        var pasoError = paso with
                        {
                            Estado = EstadoPaso.Descartado,
                            TipoEvento = TipoEventoPaso.Error,
                            ExplicacionDidactica = "No hay una ruta RIPv2 activa hacia el destino. El paquete se descarta.",
                            DetalleTecnico = "RIPv2 no encontró un camino con menos de 16 saltos.",
                            RutaRestante = Array.Empty<string>(),
                            DuracionMs = 1200
                        };

                        numeroPaso++;
                        var errorNumerado = pasoError with
                        {
                            Secuencia = ++secuencia,
                            NumeroPaso = numeroPaso,
                            TotalPasos = numeroPaso
                        };

                        simulacion.AgregarPaso(errorNumerado);
                        await sink.PasoAsync(errorNumerado, cancellationToken);
                        await FinalizarFalloAsync(simulacion, sink, "Sin ruta RIPv2 disponible");
                        return;
                    }

                    var paqueteActual = simulacion.Paquete with
                    {
                        TtlInicial = paso.CabeceraIpv4?.Ttl ?? simulacion.Paquete.TtlInicial
                    };

                    var planNuevo = escenario.CrearPlan(
                        topologia,
                        simulacion.Solicitud,
                        rutaNueva,
                        nodoInicio: paso.NodoActual,
                        paqueteExistente: paqueteActual);

                    var rutaAnterior = plan.Ruta;
                    simulacion.Plan = planNuevo;
                    simulacion.Paquete = planNuevo.Paquete;
                    plan = planNuevo;
                    indice = 0;

                    await sink.RutaRecalculadaAsync(
                        new RutaRecalculadaEvento(
                            simulacion.SimulacionId,
                            $"el enlace {paso.NodoActual} → {paso.SiguienteSalto} no está disponible",
                            rutaAnterior.Nodos,
                            rutaNueva.Nodos,
                            rutaAnterior.Costo,
                            rutaNueva.Costo,
                            _explicaciones.ExplicarRutaRecalculada(
                                rutaAnterior,
                                rutaNueva,
                                $"la caída del enlace {paso.NodoActual} → {paso.SiguienteSalto}")),
                        cancellationToken);

                    continue;
                }

                var totalPasos = numeroPaso + (plan.Pasos.Count - indice);
                var pasoNumerado = paso with
                {
                    Secuencia = ++secuencia,
                    NumeroPaso = ++numeroPaso,
                    TotalPasos = totalPasos
                };

                simulacion.AgregarPaso(pasoNumerado);
                await sink.PasoAsync(pasoNumerado, cancellationToken);
                await Task.Delay(pasoNumerado.DuracionMs, cancellationToken);
                indice++;
            }

            simulacion.Finalizada = true;
            simulacion.Exitosa = true;

            await sink.FinalizadaAsync(
                new SimulacionFinalizadaEvento(
                    simulacion.SimulacionId,
                    simulacion.Paquete.Id,
                    true,
                    $"Simulación completada: {simulacion.Historial.Count} pasos, ruta RIPv2 de métrica {simulacion.Plan.Ruta.Costo}.",
                    simulacion.DuracionTotalMs),
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            simulacion.Finalizada = true;
            simulacion.Cancelada = true;
            simulacion.Exitosa = false;
            simulacion.MotivoFinalizacion = "Cancelada";

            await sink.FinalizadaAsync(
                new SimulacionFinalizadaEvento(
                    simulacion.SimulacionId,
                    simulacion.Paquete.Id,
                    false,
                    "La simulación fue cancelada por el usuario.",
                    simulacion.DuracionTotalMs,
                    "Cancelada"),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            simulacion.Finalizada = true;
            simulacion.Exitosa = false;
            simulacion.MotivoFinalizacion = ex.Message;

            await sink.ErrorAsync(
                new ErrorSimulacionEvento(
                    simulacion.SimulacionId,
                    "ERROR_SIMULACION",
                    ex.Message,
                    "La simulación se detuvo por un error interno."),
                CancellationToken.None);

            await sink.FinalizadaAsync(
                new SimulacionFinalizadaEvento(
                    simulacion.SimulacionId,
                    simulacion.Paquete.Id,
                    false,
                    "La simulación terminó con error.",
                    simulacion.DuracionTotalMs,
                    ex.Message),
                CancellationToken.None);
        }
    }

    private async Task<EnlaceEstadoEvento> CambiarEstadoEnlaceAsync(string enlaceId, EstadoEnlace estado)
    {
        var topologia = _reader.Obtener();
        var enlace = topologia.BuscarEnlace(enlaceId)
            ?? throw new KeyNotFoundException($"No existe el enlace '{enlaceId}'.");

        if (!_mutator.CambiarEstadoEnlace(enlaceId, estado))
        {
            throw new InvalidOperationException($"No fue posible cambiar el estado del enlace '{enlaceId}'.");
        }

        return await Task.FromResult(new EnlaceEstadoEvento(
            enlace.Id,
            enlace.OrigenId,
            enlace.DestinoId,
            estado,
            _explicaciones.ExplicarEnlace(enlace, estado)));
    }

    private SimulacionActiva ObtenerSimulacion(string simulacionId) =>
        _store.Obtener(simulacionId)
        ?? throw new KeyNotFoundException($"No existe la simulación '{simulacionId}'.");

    private static async Task FinalizarFalloAsync(
        SimulacionActiva simulacion,
        ISimulationEventSink sink,
        string motivo)
    {
        simulacion.Finalizada = true;
        simulacion.Exitosa = false;
        simulacion.MotivoFinalizacion = motivo;

        await sink.FinalizadaAsync(
            new SimulacionFinalizadaEvento(
                simulacion.SimulacionId,
                simulacion.Paquete.Id,
                false,
                $"La simulación terminó sin éxito: {motivo}.",
                simulacion.DuracionTotalMs,
                motivo),
            CancellationToken.None);
    }
}
