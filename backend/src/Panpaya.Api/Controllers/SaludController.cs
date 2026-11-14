using Microsoft.AspNetCore.Mvc;

namespace Panpaya.Api.Controllers;

[ApiController]
[Route("api/salud")]
public class SaludController : ControllerBase
{
    [HttpGet]
    public IActionResult ObtenerSalud()
    {
        return Ok(new { estado = "ok", fecha = DateTimeOffset.UtcNow });
    }
}
