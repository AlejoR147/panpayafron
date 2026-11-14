using Panpaya.Application.Ports;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;

namespace Panpaya.Infrastructure.Explanations;

public sealed class TemplateExplanationProvider : IExplanationProvider
{
    public string Explicar(PasoSimulacionContext contexto)
    {
        var actual = contexto.NodoActual;
        var siguiente = contexto.SiguienteNodo;
        var enlace = contexto.Enlace;
        var destino = siguiente?.Nombre ?? "el siguiente salto";
        var gateway = contexto.NodoActual is Host host ? host.Gateway : null;

        return contexto.TipoEvento switch
        {
            TipoEventoPaso.Arp =>
                $"ARP: {actual.Nombre} pregunta quién tiene la IP {gateway ?? "del gateway"} y recibe la MAC del gateway. Sin esta resolución, el switch no sabe por qué puerto entregar la trama.",
            TipoEventoPaso.Switching =>
                $"El switch {actual.Nombre} recibe la trama, revisa la MAC destino y la reenvía hacia {destino}. No cambia las direcciones IP; solo conmuta la trama Ethernet.",
            TipoEventoPaso.Gateway =>
                $"{actual.Nombre} entrega la trama a su gateway {destino}. El gateway compara la IP destino con su tabla: si la red no es local, la reenvía hacia la WAN.",
            TipoEventoPaso.Routing =>
                $"El router {actual.Nombre} consulta su tabla RIPv2 y elige la ruta de menor cantidad de saltos hacia {destino}. En este salto se decrementa el TTL.",
            TipoEventoPaso.Wan =>
                enlace?.ProtocoloRouting == ProtocoloEnrutamiento.Estatica
                    ? $"El paquete cruza el enlace WAN {enlace.Id} ({enlace.CapacidadMbps} Mbps) mediante enrutamiento estático (sin RIPv2). El router reenvía por la ruta estática configurada y conserva las IP origen y destino."
                    : $"El paquete cruza el enlace WAN {enlace?.Id ?? "principal"} ({enlace?.CapacidadMbps ?? 0} Mbps, métrica RIPv2 {enlace?.MetricaRip ?? 1}). El router encapsula en la interfaz de salida y conserva las IP origen y destino.",
            TipoEventoPaso.Entrega =>
                $"{actual.Nombre} entrega la trama a {destino}. La MAC destino corresponde al dispositivo final o al siguiente salto de la misma red.",
            TipoEventoPaso.Respuesta =>
                $"Respuesta ICMP: el paquete regresa por la ruta inversa. {actual.Nombre} reenvía hacia {destino}, vuelve a consultar su tabla RIPv2 y decrementa el TTL.",
            TipoEventoPaso.Error =>
                contexto.Ttl <= 0
                    ? $"El paquete se descarta en {actual.Nombre}: el TTL llegó a cero. RIPv2 limita la propagación a 15 saltos para evitar bucles."
                    : $"El paquete se descarta en {actual.Nombre}: el enlace hacia {destino} no está disponible.",
            _ => $"El paquete avanza de {actual.Nombre} hacia {destino}."
        };
    }

    public string ExplicarRutaRecalculada(RutaCalculada anterior, RutaCalculada nueva, string motivo)
    {
        var rutaAnterior = string.Join(" → ", anterior.Nodos);
        var rutaNueva = string.Join(" → ", nueva.Nodos);

        return $"Se detectó {motivo}. La ruta anterior ({rutaAnterior}, métrica {anterior.Costo}) ya no es viable; RIPv2 converge a la ruta {rutaNueva} con métrica {nueva.Costo}. Los routers actualizan sus tablas y el paquete continúa.";
    }

    public string ExplicarEnlace(Enlace enlace, EstadoEnlace estado)
    {
        var cambio = estado == EstadoEnlace.Activo
            ? "El enlace volvió a estar activo y RIPv2 puede volver a anunciarlo."
            : "El enlace dejó de estar activo; RIPv2 retira la ruta y converge por el camino alterno disponible.";

        return $"El enlace {enlace.Id} entre {enlace.OrigenId} y {enlace.DestinoId} cambió a estado {estado}. {cambio}";
    }
}
