namespace Panpaya.Domain.Topologia;

public sealed class Topologia
{
    private readonly object _sync = new();
    private readonly Dictionary<string, Dispositivo> _dispositivos;
    private readonly Dictionary<string, Enlace> _enlaces;

    public Topologia(
        IEnumerable<Sede> sedes,
        IEnumerable<Dispositivo> dispositivos,
        IEnumerable<Enlace> enlaces)
    {
        ArgumentNullException.ThrowIfNull(sedes);
        ArgumentNullException.ThrowIfNull(dispositivos);
        ArgumentNullException.ThrowIfNull(enlaces);

        Sedes = sedes.ToList().AsReadOnly();
        _dispositivos = dispositivos
            .GroupBy(d => d.Id, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        _enlaces = enlaces
            .GroupBy(e => e.Id, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        ValidarIntegridad();
    }

    public IReadOnlyList<Sede> Sedes { get; }

    public IReadOnlyCollection<Dispositivo> Dispositivos => _dispositivos.Values.ToList().AsReadOnly();

    public IReadOnlyCollection<Enlace> Enlaces => _enlaces.Values.ToList().AsReadOnly();

    public Dispositivo? BuscarDispositivo(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        return _dispositivos.GetValueOrDefault(id.Trim());
    }

    public Sede? BuscarSede(string id) =>
        Sedes.FirstOrDefault(s => string.Equals(s.Id, id, StringComparison.OrdinalIgnoreCase));

    public Enlace? BuscarEnlace(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        return _enlaces.GetValueOrDefault(id.Trim());
    }

    public IReadOnlyList<Enlace> ObtenerEnlacesDe(string dispositivoId) =>
        _enlaces.Values
            .Where(e => e.Conecta(dispositivoId))
            .ToList()
            .AsReadOnly();

    public Enlace? ObtenerEnlaceEntre(string origenId, string destinoId) =>
        _enlaces.Values.FirstOrDefault(e =>
            (string.Equals(e.OrigenId, origenId, StringComparison.OrdinalIgnoreCase) &&
             string.Equals(e.DestinoId, destinoId, StringComparison.OrdinalIgnoreCase)) ||
            (string.Equals(e.OrigenId, destinoId, StringComparison.OrdinalIgnoreCase) &&
             string.Equals(e.DestinoId, origenId, StringComparison.OrdinalIgnoreCase)));

    public bool CambiarEstadoEnlace(string enlaceId, EstadoEnlace estado)
    {
        lock (_sync)
        {
            var enlace = BuscarEnlace(enlaceId);
            if (enlace is null)
            {
                return false;
            }

            enlace.CambiarEstado(estado);
            return true;
        }
    }

    private void ValidarIntegridad()
    {
        var sedesIds = Sedes
            .Select(s => s.Id)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var dispositivo in _dispositivos.Values)
        {
            if (!sedesIds.Contains(dispositivo.SedeId))
            {
                throw new InvalidOperationException(
                    $"El dispositivo '{dispositivo.Id}' referencia la sede inexistente '{dispositivo.SedeId}'.");
            }
        }

        foreach (var sede in Sedes)
        {
            if (!_dispositivos.TryGetValue(sede.RouterId, out var router) || router is not Router)
            {
                throw new InvalidOperationException(
                    $"La sede '{sede.Id}' referencia el router inexistente '{sede.RouterId}'.");
            }

            foreach (var vlan in sede.Vlans)
            {
                if (vlan.Prefijo is < 0 or > 32)
                {
                    throw new InvalidOperationException(
                        $"La VLAN {vlan.Numero} de la sede '{sede.Id}' tiene un prefijo inválido.");
                }

                if (vlan.HostsActuales < 0 || vlan.HostsConCrecimiento < 0)
                {
                    throw new InvalidOperationException(
                        $"La VLAN {vlan.Numero} de la sede '{sede.Id}' tiene cantidades inválidas.");
                }
            }
        }

        foreach (var enlace in _enlaces.Values)
        {
            if (!_dispositivos.ContainsKey(enlace.OrigenId))
            {
                throw new InvalidOperationException(
                    $"El enlace '{enlace.Id}' referencia el dispositivo inexistente '{enlace.OrigenId}'.");
            }

            if (!_dispositivos.ContainsKey(enlace.DestinoId))
            {
                throw new InvalidOperationException(
                    $"El enlace '{enlace.Id}' referencia el dispositivo inexistente '{enlace.DestinoId}'.");
            }
        }
    }
}
