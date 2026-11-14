using System.Text.Json;
using System.Text.Json.Serialization;
using Panpaya.Domain.Simulacion;
using Panpaya.Domain.Topologia;
using Panpaya.Infrastructure.Realtime;

namespace Panpaya.Tests.Unit.Simulacion;

public sealed class SimulacionSignalRContractTests
{
    private static readonly JsonSerializerOptions OpcionesSimulacion = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    public void ISimulacionClient_Expones_Estos_Eventos_Con_Estos_Nombres()
    {
        var nombres = typeof(ISimulacionClient).GetMethods()
            .Select(m => m.Name)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(new[]
        {
            "ErrorSimulacion",
            "EstadoEnlaceCambiado",
            "EstadoSimulacion",
            "PasoSimulacion",
            "RutaRecalculada",
            "SimulacionFinalizada",
            "SimulacionIniciada",
        }, nombres);
    }

    [Fact]
    public void ISimulacionClient_Cada_Evento_Tiene_Un_Solo_Parametro_Del_Tipo_De_Evento()
    {
        var tipos = new Dictionary<string, Type>
        {
            ["SimulacionIniciada"] = typeof(SimulacionIniciadaEvento),
            ["PasoSimulacion"] = typeof(PasoSimulacion),
            ["RutaRecalculada"] = typeof(RutaRecalculadaEvento),
            ["EstadoEnlaceCambiado"] = typeof(EnlaceEstadoEvento),
            ["SimulacionFinalizada"] = typeof(SimulacionFinalizadaEvento),
            ["ErrorSimulacion"] = typeof(ErrorSimulacionEvento),
            ["EstadoSimulacion"] = typeof(EstadoSimulacionEvento),
        };

        foreach (var contrato in tipos)
        {
            var metodo = typeof(ISimulacionClient).GetMethods().Single(m => m.Name == contrato.Key);
            var parametros = metodo.GetParameters();
            Assert.Single(parametros);
            Assert.Equal(contrato.Value, parametros[0].ParameterType);
        }
    }

    [Fact]
    public void SimulacionHub_Acepta_DtoYEmite_Nombres_De_Eventos_Consistentes()
    {
        var nombres = typeof(SimulacionHub).GetMethods()
            .Where(m => m.DeclaringType == typeof(SimulacionHub))
            .Select(m => m.Name)
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(new[]
        {
            "CancelarSimulacion",
            "IniciarSimulacion",
            "PausarSimulacion",
            "ReanudarSimulacion",
            "RestaurarEnlace",
            "SimularCaidaEnlace",
            "SolicitarEstado",
        }, nombres);
    }

    [Fact]
    public void ContratoJson_SimulacionFinalizada_Emiten_Nombres_CamelCase_Y_Enum_Como_String()
    {
        var evento = new SimulacionFinalizadaEvento("sim-1", "paq-1", true, "Simulacion completada.", 1500, "Cancelada");

        var json = JsonSerializer.Serialize(evento, OpcionesSimulacion);
        using var documento = JsonDocument.Parse(json);
        var raiz = documento.RootElement;

        Assert.True(raiz.TryGetProperty("simulacionId", out _));
        Assert.True(raiz.TryGetProperty("paqueteId", out _));
        Assert.True(raiz.TryGetProperty("exito", out _));
        Assert.True(raiz.TryGetProperty("resumen", out _));
        Assert.True(raiz.TryGetProperty("duracionTotalMs", out _));
        Assert.True(raiz.TryGetProperty("motivo", out _));
        Assert.False(raiz.TryGetProperty("SimulacionId", out _));
    }

    [Fact]
    public void ContratoJson_PasoSimulacion_Emiten_Nombres_CamelCase_Y_Enum_Como_String()
    {
        var paso = new PasoSimulacion(
            PaqueteId: "paq-1",
            SimulacionId: "sim-1",
            Secuencia: 1,
            NumeroPaso: 1,
            TotalPasos: 5,
            NodoActual: "rtr-bog",
            SiguienteSalto: "rtr-cal",
            Estado: EstadoPaso.Exitoso,
            TipoEvento: TipoEventoPaso.Routing,
            ExplicacionDidactica: "El router enruta.",
            DetalleTecnico: "RIPv2 +1",
            DuracionMs: 1200,
            CabeceraIpv4: new CabeceraIpv4(4, 5, 0, 84, 1, "0x4000", 64, 1, "0x0000", "10.20.0.2", "10.20.2.5"),
            RutaRestante: new List<string> { "rtr-cal" },
            Metricas: new MetricasPaso(2, 1));

        var json = JsonSerializer.Serialize(paso, OpcionesSimulacion);
        using var documento = JsonDocument.Parse(json);
        var raiz = documento.RootElement;

        Assert.True(raiz.TryGetProperty("paqueteId", out _));
        Assert.True(raiz.TryGetProperty("simulacionId", out _));
        Assert.True(raiz.TryGetProperty("secuencia", out _));
        Assert.True(raiz.TryGetProperty("numeroPaso", out _));
        Assert.True(raiz.TryGetProperty("totalPasos", out _));
        Assert.True(raiz.TryGetProperty("nodoActual", out _));
        Assert.True(raiz.TryGetProperty("siguienteSalto", out _));
        Assert.True(raiz.TryGetProperty("estado", out _));
        Assert.True(raiz.TryGetProperty("tipoEvento", out _));
        Assert.True(raiz.TryGetProperty("explicacionDidactica", out _));
        Assert.True(raiz.TryGetProperty("detalleTecnico", out _));
        Assert.True(raiz.TryGetProperty("duracionMs", out _));
        Assert.True(raiz.TryGetProperty("cabeceraIpv4", out _));
        Assert.True(raiz.TryGetProperty("rutaRestante", out _));
        Assert.True(raiz.TryGetProperty("metricas", out _));

        Assert.Equal("Exitoso", raiz.GetProperty("estado").GetString());
    }

    [Fact]
    public void SolicitudSimulacion_Defaults_Y_AsignacionDeCampos()
    {
        var solicitud = new SolicitudSimulacion("pc-med-admin-01", "srv-bog-erp-01");

        Assert.Equal("pc-med-admin-01", solicitud.OrigenId);
        Assert.Equal("srv-bog-erp-01", solicitud.DestinoId);
        Assert.Equal(TipoPaquete.Icmp, solicitud.Tipo);
        Assert.True(solicitud.IncluirArp);
        Assert.True(solicitud.SimularRespuesta);
        Assert.Equal(1.0, solicitud.Velocidad);
    }

    [Fact]
    public void SolicitudSimulacion_SerializaCon_Nombres_CamelCase_De_Campo()
    {
        var solicitud = new SolicitudSimulacion(
            "pc-med-admin-01",
            "srv-bog-erp-01",
            TipoPaquete.Icmp,
            IncluirArp: true,
            SimularRespuesta: false,
            Velocidad: 4);

        var json = JsonSerializer.Serialize(solicitud, OpcionesSimulacion);
        using var documento = JsonDocument.Parse(json);
        var raiz = documento.RootElement;

        Assert.True(raiz.TryGetProperty("origenId", out _));
        Assert.True(raiz.TryGetProperty("destinoId", out _));
        Assert.True(raiz.TryGetProperty("tipo", out _));
        Assert.True(raiz.TryGetProperty("incluirArp", out _));
        Assert.True(raiz.TryGetProperty("simularRespuesta", out _));
        Assert.True(raiz.TryGetProperty("velocidad", out _));
    }
}
