import type { TopologiaSnapshotDto } from '../../api/types';
import { buildCityModel, type CityModel } from '../../lib/scene/cityModel';

const cache = new WeakMap<TopologiaSnapshotDto, CityModel>();

export function obtenerCityModel(snapshot: TopologiaSnapshotDto): CityModel {
  const existente = cache.get(snapshot);
  if (existente) return existente;
  const model = buildCityModel(snapshot);
  cache.set(snapshot, model);
  return model;
}
