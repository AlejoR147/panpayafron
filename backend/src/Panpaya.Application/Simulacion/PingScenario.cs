using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;

namespace Panpaya.Application.Simulacion;

public sealed class PingScenario : ITrafficScenario
{
    private readonly IExplanationProvider _explicaciones;

    public PingScenario(IExplanationProvider explicaciones)
    {
        _explicaciones = explicaciones ?? throw new ArgumentNullException(nameof(explicaciones));
    }

    public TipoPaquete Tipo => TipoPaquete.Icmp;

    public PlanSimulacion CrearPlan(
        Topologia topologia,
        SolicitudSimulacion solicitud,
        RutaCalculada ruta,
        string? nodoInicio = null,
        PaqueteSimulacion? paqueteExistente = null)
    {
        ArgumentNullException.ThrowIfNull(topologia);
        ArgumentNullException.ThrowIfNull(solicitud);
        ArgumentNullException.ThrowIfNull(ruta);

        if (ruta.Nodos.Count < 2)
        {
            throw new InvalidOperationException("La ruta debe contener al menos origen y destino.");
        }

        var origen = topologia.BuscarDispositivo(solicitud.OrigenId)
            ?? throw new InvalidOperationException($"No existe el dispositivo origen '{solicitud.OrigenId}'.");
        var destino = topologia.BuscarDispositivo(solicitud.DestinoId)
            ?? throw new InvalidOperationException($"No existe el dispositivo destino '{solicitud.DestinoId}'.");

        var paquete = paqueteExistente ?? CrearPaquete(origen, destino);
        var inicio = nodoInicio ?? ruta.Nodos[0];
        var indiceInicio = BuscarIndice(ruta.Nodos, inicio);
        if (indiceInicio < 0)
        {
            indiceInicio = 0;
        }

        var esReenvio = paqueteExistente is not null || indiceInicio > 0;
        var pasos = new List<PasoSimulacion>();

        if (solicitud.IncluirArp && !esReenvio && ruta.Nodos.Count > 1)
        {
            var actual = topologia.BuscarDispositivo(ruta.Nodos[0]) ?? origen;
            var siguiente = topologia.BuscarDispositivo(ruta.Nodos[1])
                ?? throw new InvalidOperationException($"No existe el dispositivo '{ruta.Nodos[1]}'.");
            var enlace = topologia.ObtenerEnlaceEntre(actual.Id, siguiente.Id);
            var contexto = new PasoSimulacionContext(
                actual,
                siguiente,
                enlace,
                paquete,
                TipoEventoPaso.Arp,
                paquete.TtlInicial,
                0);

            pasos.Add(CrearPaso(
                paquete,
                actual,
                siguiente,
                enlace,
                contexto,
                TipoEventoPaso.Arp,
                EstadoPaso.Exitoso,
                paquete.TtlInicial,
                0,
                0,
                ruta.Nodos.Skip(1).ToList(),
                solicitud.Velocidad,
                0,
                esRespuesta: false));
        }

        var ttl = paqueteExistente?.TtlInicial ?? paquete.TtlInicial;
        var costo = 0;
        var descartado = false;

        for (var i = indiceInicio; i < ruta.Nodos.Count - 1; i++)
        {
            var actual = topologia.BuscarDispositivo(ruta.Nodos[i])
                ?? throw new InvalidOperationException($"No existe el dispositivo '{ruta.Nodos[i]}'.");
            var siguiente = topologia.BuscarDispositivo(ruta.Nodos[i + 1])
                ?? throw new InvalidOperationException($"No existe el dispositivo '{ruta.Nodos[i + 1]}'.");
            var enlace = topologia.ObtenerEnlaceEntre(actual.Id, siguiente.Id);

            if (actual is Router)
            {
                ttl--;
            }

            if (ttl <= 0)
            {
                var contextoError = new PasoSimulacionContext(
                    actual,
                    siguiente,
                    enlace,
                    paquete,
                    TipoEventoPaso.Error,
                    ttl,
                    costo);

                pasos.Add(CrearPaso(
                    paquete,
                    actual,
                    siguiente,
                    enlace,
                    contextoError,
                    TipoEventoPaso.Error,
                    EstadoPaso.Descartado,
                    ttl,
                    costo,
                    i - indiceInicio + 1,
                    ruta.Nodos.Skip(i + 1).ToList(),
                    solicitud.Velocidad,
                    pasos.Count,
                    esRespuesta: false));
                descartado = true;
                break;
            }

            costo += enlace?.MetricaRip ?? 1;
            var tipoEvento = DeterminarTipoEvento(actual, siguiente, enlace);
            var contexto = new PasoSimulacionContext(
                actual,
                siguiente,
                enlace,
                paquete,
                tipoEvento,
                ttl,
                costo);

            pasos.Add(CrearPaso(
                paquete,
                actual,
                siguiente,
                enlace,
                contexto,
                tipoEvento,
                EstadoPaso.Exitoso,
                ttl,
                costo,
                i - indiceInicio + 1,
                ruta.Nodos.Skip(i + 1).ToList(),
                solicitud.Velocidad,
                pasos.Count,
                esRespuesta: false));
        }

        if (solicitud.SimularRespuesta && !descartado)
        {
            var nodosInversos = ruta.Nodos.Reverse().ToList();
            var paqueteRespuesta = paquete with
            {
                IpOrigen = paquete.IpDestino,
                IpDestino = paquete.IpOrigen,
                MacOrigen = paquete.MacDestino,
                MacDestino = paquete.MacOrigen,
                TtlInicial = 64,
                Estado = EstadoPaso.Procesando,
                PasoActual = 0
            };

            var ttlRespuesta = 64;
            var costoRespuesta = 0;

            for (var i = 0; i < nodosInversos.Count - 1; i++)
            {
                var actual = topologia.BuscarDispositivo(nodosInversos[i])
                    ?? throw new InvalidOperationException($"No existe el dispositivo '{nodosInversos[i]}'.");
                var siguiente = topologia.BuscarDispositivo(nodosInversos[i + 1])
                    ?? throw new InvalidOperationException($"No existe el dispositivo '{nodosInversos[i + 1]}'.");
                var enlace = topologia.ObtenerEnlaceEntre(actual.Id, siguiente.Id);

                if (actual is Router)
                {
                    ttlRespuesta--;
                }

                if (ttlRespuesta <= 0)
                {
                    var contextoError = new PasoSimulacionContext(
                        actual,
                        siguiente,
                        enlace,
                        paqueteRespuesta,
                        TipoEventoPaso.Error,
                        ttlRespuesta,
                        costoRespuesta);

                    pasos.Add(CrearPaso(
                        paqueteRespuesta,
                        actual,
                        siguiente,
                        enlace,
                        contextoError,
                        TipoEventoPaso.Error,
                        EstadoPaso.Descartado,
                        ttlRespuesta,
                        costoRespuesta,
                        i + 1,
                        nodosInversos.Skip(i + 1).ToList(),
                        solicitud.Velocidad,
                        pasos.Count,
                        esRespuesta: true));
                    break;
                }

                costoRespuesta += enlace?.MetricaRip ?? 1;
                var contexto = new PasoSimulacionContext(
                    actual,
                    siguiente,
                    enlace,
                    paqueteRespuesta,
                    TipoEventoPaso.Respuesta,
                    ttlRespuesta,
                    costoRespuesta);

                pasos.Add(CrearPaso(
                    paqueteRespuesta,
                    actual,
                    siguiente,
                    enlace,
                    contexto,
                    TipoEventoPaso.Respuesta,
                    EstadoPaso.Exitoso,
                    ttlRespuesta,
                    costoRespuesta,
                    i + 1,
                    nodosInversos.Skip(i + 1).ToList(),
                    solicitud.Velocidad,
                    pasos.Count,
                    esRespuesta: true));
            }
        }

        var total = pasos.Count;
        var numerados = pasos
            .Select((paso, indice) => paso with
            {
                NumeroPaso = indice + 1,
                Secuencia = indice + 1,
                TotalPasos = total
            })
            .ToList();

        return new PlanSimulacion(paquete, numerados, ruta);
    }

    private static PaqueteSimulacion CrearPaquete(Dispositivo origen, Dispositivo destino) =>
        new(
            Guid.NewGuid().ToString("N"),
            Guid.NewGuid().ToString("N"),
            TipoPaquete.Icmp,
            origen.Id,
            destino.Id,
            origen.Ip ?? string.Empty,
            destino.Ip ?? string.Empty,
            origen.Mac,
            destino.Mac,
            64,
            84,
            EstadoPaso.Procesando,
            0);

    private static int BuscarIndice(IReadOnlyList<string> nodos, string id)
    {
        for (var i = 0; i < nodos.Count; i++)
        {
            if (string.Equals(nodos[i], id, StringComparison.Ordinal))
            {
                return i;
            }
        }

        return -1;
    }

    private static TipoEventoPaso DeterminarTipoEvento(Dispositivo actual, Dispositivo siguiente, Enlace? enlace)
    {
        if (actual is Router && siguiente is Router)
        {
            return enlace?.Tipo is TipoEnlace.Wan or TipoEnlace.Respaldo
                ? TipoEventoPaso.Wan
                : TipoEventoPaso.Routing;
        }

        if (actual is Host && siguiente is Switch)
        {
            return TipoEventoPaso.Switching;
        }

        if (siguiente is Router)
        {
            return TipoEventoPaso.Gateway;
        }

        if (actual is Router && siguiente is Switch)
        {
            return TipoEventoPaso.Entrega;
        }

        if (actual is Switch && siguiente is Host)
        {
            return TipoEventoPaso.Entrega;
        }

        return TipoEventoPaso.Switching;
    }

    private PasoSimulacion CrearPaso(
        PaqueteSimulacion paquete,
        Dispositivo actual,
        Dispositivo siguiente,
        Enlace? enlace,
        PasoSimulacionContext contexto,
        TipoEventoPaso tipoEvento,
        EstadoPaso estado,
        int ttl,
        int costo,
        int saltos,
        IReadOnlyList<string> rutaRestante,
        double velocidad,
        int secuencia,
        bool esRespuesta)
    {
        var detalle = esRespuesta
            ? $"Respuesta ICMP · {actual.Nombre} → {siguiente.Nombre} · RIPv2 +{enlace?.MetricaRip ?? 1} · TTL {ttl}"
            : $"{actual.Nombre} → {siguiente.Nombre} · RIPv2 +{enlace?.MetricaRip ?? 1} · {enlace?.CapacidadMbps ?? 0} Mbps · TTL {ttl}";

        return new PasoSimulacion(
            paquete.Id,
            paquete.SimulacionId,
            secuencia + 1,
            0,
            0,
            actual.Id,
            siguiente.Id,
            estado,
            tipoEvento,
            _explicaciones.Explicar(contexto),
            detalle,
            CalcularDuracion(tipoEvento, velocidad),
            CrearCabecera(paquete, ttl),
            rutaRestante,
            new MetricasPaso(costo, saltos));
    }

    private static CabeceraIpv4 CrearCabecera(PaqueteSimulacion paquete, int ttl) =>
        new(
            4,
            5,
            0,
            paquete.TamanioBytes,
            1,
            "0x4000",
            ttl,
            1,
            "0x0000",
            paquete.IpOrigen,
            paquete.IpDestino);

    private static int CalcularDuracion(TipoEventoPaso tipoEvento, double velocidad)
    {
        var baseMs = tipoEvento switch
        {
            TipoEventoPaso.Arp => 900,
            TipoEventoPaso.Switching => 700,
            TipoEventoPaso.Gateway => 900,
            TipoEventoPaso.Routing => 1200,
            TipoEventoPaso.Wan => 1600,
            TipoEventoPaso.Entrega => 900,
            TipoEventoPaso.Respuesta => 1200,
            TipoEventoPaso.Error => 1200,
            _ => 900
        };

        var factor = Math.Clamp(velocidad, 0.25, 4.0);
        return Math.Clamp((int)Math.Round(baseMs / factor), 150, 5000);
    }
}
