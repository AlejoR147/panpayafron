using Microsoft.AspNetCore.Mvc;
using Panpaya.Application.Contratos;

namespace Panpaya.Api.Controllers;

[ApiController]
[Route("api/sedes")]
public class SedesController : ControllerBase
{
    private readonly ITopologiaQueryService _topologiaQueryService;

    public SedesController(ITopologiaQueryService topologiaQueryService)
    {
        _topologiaQueryService = topologiaQueryService;
    }

    [HttpGet]
    public ActionResult<IReadOnlyList<SedeDto>> ObtenerSedes() => Ok(_topologiaQueryService.ObtenerSedes());

    [HttpGet("{id}")]
    public ActionResult<SedeDto> ObtenerSede(string id)
    {
        var sede = _topologiaQueryService.ObtenerSede(id);
        if (sede is null)
        {
            return NotFound();
        }

        return Ok(sede);
    }
}
