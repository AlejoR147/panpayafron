using Microsoft.AspNetCore.Mvc;
using Panpaya.Application.Contratos;
using Panpaya.Application.Ports;

namespace Panpaya.Api.Controllers;

[ApiController]
[Route("api/topologia")]
public class TopologiaController : ControllerBase
{
    private readonly ITopologiaQueryService _topologiaQueryService;

    public TopologiaController(ITopologiaQueryService topologiaQueryService)
    {
        _topologiaQueryService = topologiaQueryService;
    }

    [HttpGet]
    public ActionResult<TopologiaSnapshotDto> ObtenerSnapshot() => Ok(_topologiaQueryService.ObtenerSnapshot());

    [HttpGet("metricas")]
    public ActionResult<MetricasNacionalesDto> ObtenerMetricas() => Ok(_topologiaQueryService.ObtenerMetricas());

    [HttpGet("nodos")]
    public ActionResult<IReadOnlyList<NodoRedDto>> ObtenerNodos()
    {
        var snapshot = _topologiaQueryService.ObtenerSnapshot();
        return Ok(snapshot.Nodos);
    }

    [HttpGet("enlaces")]
    public ActionResult<IReadOnlyList<EnlaceRedDto>> ObtenerEnlaces()
    {
        var snapshot = _topologiaQueryService.ObtenerSnapshot();
        return Ok(snapshot.Enlaces);
    }
}
