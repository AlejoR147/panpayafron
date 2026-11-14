using System.Text.Json;
using System.Text.Json.Serialization;
using Panpaya.Application.Contratos;
using Panpaya.Domain.Topologia;

namespace Panpaya.Tests.Unit.Contratos;

public sealed class TopologiaMapperTests
{
    [Fact]
    public void Host_AlMapear_DevuelveGatewayYCategoriaYDejaNulosCamposDeRouterYSwitch()
    {
        var host = new Host(
            "pc-bog-admin-01",
            "PC Bogota Administracion",
            TipoNodo.Pc,
            "bogota",
            10,
            "10.20.1.10",
            "02:00:00:00:0A:01",
            gateway: "10.20.1.1",
            categoria: "PC administrativos");

        var dto = TopologiaMapper.ToDto(host);

        Assert.Equal("10.20.1.1", dto.Gateway);
        Assert.Equal("PC administrativos", dto.Categoria);
        Assert.Null(dto.WanIp);
        Assert.Null(dto.InterfacesVlan);
        Assert.Null(dto.EsCore);
        Assert.Null(dto.VlansTrunk);
    }

    [Fact]
    public void Host_AlMapear_NoExponeDatosDeRouterNiSwitchNiDatosInvenidos()
    {
        var host = new Host(
            "srv-bog-erp-01",
            "Servidor ERP Bogota",
            TipoNodo.Servidor,
            "bogota",
            80,
            "10.20.2.193",
            "02:00:00:00:0A:80",
            gateway: null,
            categoria: null);

        var dto = TopologiaMapper.ToDto(host);

        Assert.Null(dto.Gateway);
        Assert.Null(dto.Categoria);
        Assert.Null(dto.WanIp);
        Assert.Null(dto.InterfacesVlan);
        Assert.Null(dto.EsCore);
        Assert.Null(dto.VlansTrunk);
        Assert.Equal("srv-bog-erp-01", dto.Id);
        Assert.Equal(TipoNodo.Servidor, dto.Tipo);
    }

    [Fact]
    public void Router_AlMapear_DevuelveWanIpYInterfacesVlanYDejaNulosCamposDeHostYSwitch()
    {
        var router = new Router(
            "rtr-bog",
            "Router Bogota",
            "bogota",
            "10.20.80.1",
            new List<InterfazVlan>
            {
                new(10, "10.20.1.1", 25, "10.20.1.0")
            });

        var dto = TopologiaMapper.ToDto(router);

        Assert.Equal("10.20.80.1", dto.WanIp);
        Assert.NotNull(dto.InterfacesVlan);
        var interfaz = Assert.Single(dto.InterfacesVlan);
        Assert.Equal(10, interfaz.VlanId);
        Assert.Equal("10.20.1.1", interfaz.Ip);
        Assert.Equal(25, interfaz.Prefijo);
        Assert.Equal("10.20.1.0", interfaz.Red);
        Assert.Null(dto.Gateway);
        Assert.Null(dto.Categoria);
        Assert.Null(dto.EsCore);
        Assert.Null(dto.VlansTrunk);
    }

    [Fact]
    public void Switch_AlMapear_DevuelveEsCoreYVlansTrunkYDejaNulosCamposDeHostYRouter()
    {
        var switchDispositivo = new Switch(
            "sw-bog-core",
            "Switch Core Bogota",
            "bogota",
            esCore: true,
            vlansTrunk: new List<int> { 20, 10 });

        var dto = TopologiaMapper.ToDto(switchDispositivo);

        Assert.NotNull(dto.EsCore);
        Assert.True(dto.EsCore.Value);
        Assert.NotNull(dto.VlansTrunk);
        Assert.Equal(new List<int> { 10, 20 }, dto.VlansTrunk.ToList());
        Assert.Null(dto.Gateway);
        Assert.Null(dto.Categoria);
        Assert.Null(dto.WanIp);
        Assert.Null(dto.InterfacesVlan);
    }

    [Fact]
    public void NodoRedDto_DeHost_SerializaEnCamelCase()
    {
        var host = new Host(
            "pc-bog-admin-01",
            "PC Bogota Administracion",
            TipoNodo.Pc,
            "bogota",
            10,
            "10.20.1.10",
            "02:00:00:00:0A:01",
            gateway: "10.20.1.1",
            categoria: "PC administrativos");

        var dto = TopologiaMapper.ToDto(host);
        var opciones = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new JsonStringEnumConverter() }
        };
        var json = JsonSerializer.Serialize(dto, opciones);

        Assert.Contains("\"gateway\"", json);
        Assert.Contains("\"categoria\"", json);
        Assert.Contains("\"wanIp\"", json);
        Assert.Contains("\"interfacesVlan\"", json);
        Assert.Contains("\"esCore\"", json);
        Assert.Contains("\"vlansTrunk\"", json);
        Assert.Contains("\"posicion2D\"", json);
        Assert.DoesNotContain("\"Gateway\"", json);
    }
}
