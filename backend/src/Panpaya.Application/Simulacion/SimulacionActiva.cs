using System.Diagnostics;
using Panpaya.Domain.Simulacion;

namespace Panpaya.Application.Simulacion;

public sealed class SimulacionActiva
{
    private readonly object _sync = new();
    private readonly List<PasoSimulacion> _historial = new();
    private readonly Stopwatch _cronometro = Stopwatch.StartNew();
    private TaskCompletionSource<bool>? _pausaTcs;
    private bool _pausada;
    private PlanSimulacion _plan;
    private PaqueteSimulacion _paquete;
    private int _pasoActual;

    public SimulacionActiva(
        string simulacionId,
        SolicitudSimulacion solicitud,
        string conexionId,
        PlanSimulacion plan,
        PaqueteSimulacion paquete)
    {
        SimulacionId = simulacionId;
        Solicitud = solicitud;
        ConexionId = conexionId;
        _plan = plan;
        _paquete = paquete;
    }

    public string SimulacionId { get; }
    public SolicitudSimulacion Solicitud { get; }
    public string ConexionId { get; }
    public DateTimeOffset IniciadaEn { get; } = DateTimeOffset.UtcNow;
    public CancellationTokenSource Cancelacion { get; } = new();

    public PlanSimulacion Plan
    {
        get { lock (_sync) return _plan; }
        set { lock (_sync) _plan = value; }
    }

    public PaqueteSimulacion Paquete
    {
        get { lock (_sync) return _paquete; }
        set { lock (_sync) _paquete = value; }
    }

    public int PasoActual
    {
        get { lock (_sync) return _pasoActual; }
    }

    public bool Pausada
    {
        get { lock (_sync) return _pausada; }
    }

    public bool Finalizada { get; set; }
    public bool Cancelada { get; set; }
    public bool Exitosa { get; set; }
    public string? MotivoFinalizacion { get; set; }

    public IReadOnlyList<PasoSimulacion> Historial
    {
        get { lock (_sync) return _historial.ToList().AsReadOnly(); }
    }

    public void AgregarPaso(PasoSimulacion paso)
    {
        lock (_sync)
        {
            _historial.Add(paso);
            _pasoActual = paso.NumeroPaso;
            _paquete = _paquete with { PasoActual = paso.NumeroPaso, Estado = paso.Estado };
        }
    }

    public void Pausar()
    {
        lock (_sync)
        {
            _pausada = true;
        }
    }

    public void Reanudar()
    {
        TaskCompletionSource<bool>? tcs;
        lock (_sync)
        {
            _pausada = false;
            tcs = _pausaTcs;
            _pausaTcs = null;
        }

        tcs?.TrySetResult(true);
    }

    public async Task EsperarSiPausadaAsync(CancellationToken cancellationToken)
    {
        Task? espera = null;
        lock (_sync)
        {
            if (_pausada)
            {
                _pausaTcs ??= new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                espera = _pausaTcs.Task;
            }
        }

        if (espera is not null)
        {
            await espera.WaitAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    public int DuracionTotalMs => (int)_cronometro.ElapsedMilliseconds;
}
