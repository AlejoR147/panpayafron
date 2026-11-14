export interface SceneConfig {
  unidad: 'm';
  alturaPisoM: number;
  espesorLosaM: number;
  espesorParedM: number;
  alturaParedM: number;
  anchoPasilloM: number;
  areaMinimaPisoM2: number;
  m2PorHost: number;
  factorApoyo: number;
  relacionHuellaMin: number;
  relacionHuellaMax: number;
  margenSalaM: number;
  separacionHostXM: number;
  separacionHostZM: number;
  holguraHostM: number;
  anchoPuertaM: number;
  areaCoberturaApm2: number;
  radioCoberturaApM: number;
  alturaApBajoLosaM: number;
  apsPorSede: Record<string, number>;
  personasPorHost: number;
  salSemilla: string;
  maxHostsPorSala: number;
  minHostsPorSala: number;
}

export const SCENE_CONFIG: SceneConfig = {
  unidad: 'm',
  alturaPisoM: 3.4,
  espesorLosaM: 0.18,
  espesorParedM: 0.15,
  alturaParedM: 2.8,
  anchoPasilloM: 2.4,
  areaMinimaPisoM2: 180,
  m2PorHost: 7,
  factorApoyo: 0.25,
  relacionHuellaMin: 1.5,
  relacionHuellaMax: 2.2,
  margenSalaM: 0.25,
  separacionHostXM: 1.6,
  separacionHostZM: 1.4,
  holguraHostM: 0.6,
  anchoPuertaM: 1,
  areaCoberturaApm2: 140,
  radioCoberturaApM: Math.sqrt(140 / Math.PI),
  alturaApBajoLosaM: 0.2,
  apsPorSede: {
    bogota: 29,
    medellin: 8,
    cali: 8,
  },
  personasPorHost: 0.5,
  salSemilla: 'panpaya-3d-v1',
  maxHostsPorSala: 80,
  minHostsPorSala: 1,
};
