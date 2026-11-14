using Microsoft.AspNetCore.Mvc;
using Panpaya.Application.Contratos;

namespace Panpaya.Api.Controllers;

[ApiController]
[Route("api/inventario")]
public class InventarioController : ControllerBase
{
    private readonly ITopologiaQueryService _topologiaQueryService;

    public InventarioController(ITopologiaQueryService topologiaQueryService)
    {
        _topologiaQueryService = topologiaQueryService;
    }

    [HttpGet]
    public ActionResult<IReadOnlyList<ResumenInventarioDto>> ObtenerResumenPorTipo()
    {
        var metricas = _topologiaQueryService.ObtenerMetricas();
        return Ok(metricas.EquiposPorTipo);
    }

    [HttpGet("{sedeId}")]
    public ActionResult<IReadOnlyList<InventarioItemDto>> ObtenerPorSede(string sedeId)
    {
        var sede = _topologiaQueryService.ObtenerSede(sedeId);
        if (sede is null)
        {
            return NotFound();
        }

        return Ok(sede.Inventario);
    }
}
