export interface CityConfig {
  citySize: number;
  streetWidth: number;
  sidewalkWidth: number;
  blockSpacing: number;
  wanHub: [number, number, number];
  origins: Record<string, { x: number; z: number }>;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export const CITY_CONFIG: CityConfig = {
  citySize: 240,
  streetWidth: 10,
  sidewalkWidth: 3,
  blockSpacing: 60,
  wanHub: [0, 30, -12],
  origins: {
    bogota: { x: 0, z: 0 },
    medellin: { x: -68, z: -52 },
    barranquilla: { x: 68, z: -52 },
    cali: { x: -68, z: 52 },
    bucaramanga: { x: 68, z: 52 },
  },
  camera: {
    position: [0, 38, 72],
    target: [0, 4, -6],
  },
};
