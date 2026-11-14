using Panpaya.Domain.Topologia;

namespace Panpaya.Domain.Simulacion;

public enum TipoPaquete
{
    Icmp,
    Arp,
    Http,
    Voip
}

public enum EstadoPaso
{
    Procesando,
    Exitoso,
    Descartado
}

public enum TipoEventoPaso
{
    Arp,
    Switching,
    Gateway,
    Routing,
    Wan,
    Entrega,
    Respuesta,
    Error
}

public sealed record SolicitudSimulacion(
    string OrigenId,
    string DestinoId,
    TipoPaquete Tipo = TipoPaquete.Icmp,
    bool IncluirArp = true,
    bool SimularRespuesta = true,
    double Velocidad = 1.0);

public sealed record RutaCalculada(IReadOnlyList<string> Nodos, int Costo);

public sealed record CabeceraIpv4(
    int Version,
    int Ihl,
    int Dscp,
    int LongitudTotal,
    int Identificacion,
    string Flags,
    int Ttl,
    int Protocolo,
    string Checksum,
    string IpOrigen,
    string IpDestino);

public sealed record MetricasPaso(int CostoAcumulado, int Saltos);

public sealed record PaqueteSimulacion(
    string Id,
    string SimulacionId,
    TipoPaquete Tipo,
    string OrigenId,
    string DestinoId,
    string IpOrigen,
    string IpDestino,
    string? MacOrigen,
    string? MacDestino,
    int TtlInicial,
    int TamanioBytes,
    EstadoPaso Estado,
    int PasoActual);

public sealed record PasoSimulacion(
    string PaqueteId,
    string SimulacionId,
    int Secuencia,
    int NumeroPaso,
    int TotalPasos,
    string NodoActual,
    string SiguienteSalto,
    EstadoPaso Estado,
    TipoEventoPaso TipoEvento,
    string ExplicacionDidactica,
    string DetalleTecnico,
    int DuracionMs,
    CabeceraIpv4? CabeceraIpv4 = null,
    IReadOnlyList<string>? RutaRestante = null,
    MetricasPaso? Metricas = null);

public sealed record PlanSimulacion(
    PaqueteSimulacion Paquete,
    IReadOnlyList<PasoSimulacion> Pasos,
    RutaCalculada Ruta);

public sealed record PasoSimulacionContext(
    Dispositivo NodoActual,
    Dispositivo? SiguienteNodo,
    Enlace? Enlace,
    PaqueteSimulacion Paquete,
    TipoEventoPaso TipoEvento,
    int Ttl,
    int CostoAcumulado,
    IReadOnlyList<string>? RutaAnterior = null,
    IReadOnlyList<string>? RutaNueva = null);

public sealed record SimulacionIniciadaEvento(
    string SimulacionId,
    PaqueteSimulacion Paquete,
    IReadOnlyList<string> RutaCompleta,
    int PasosTotales,
    string Mensaje);

public sealed record RutaRecalculadaEvento(
    string SimulacionId,
    string Motivo,
    IReadOnlyList<string> RutaAnterior,
    IReadOnlyList<string> RutaNueva,
    int CostoAnterior,
    int CostoNuevo,
    string ExplicacionDidactica);

public sealed record EnlaceEstadoEvento(
    string EnlaceId,
    string OrigenId,
    string DestinoId,
    EstadoEnlace Estado,
    string ExplicacionDidactica);

public sealed record SimulacionFinalizadaEvento(
    string SimulacionId,
    string PaqueteId,
    bool Exito,
    string Resumen,
    int DuracionTotalMs,
    string? Motivo = null);

public sealed record ErrorSimulacionEvento(
    string? SimulacionId,
    string Codigo,
    string Mensaje,
    string? ExplicacionDidactica = null);

public sealed record EstadoSimulacionEvento(
    string SimulacionId,
    PaqueteSimulacion Paquete,
    PasoSimulacion? PasoActual,
    IReadOnlyList<PasoSimulacion> Historial,
    IReadOnlyList<EnlaceEstadoEvento> Enlaces,
    bool Finalizada);
