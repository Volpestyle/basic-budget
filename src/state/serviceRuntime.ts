import { createBackendServices, type BackendServices } from '../backend/services';

let servicesPromise: Promise<BackendServices> | null = null;
let servicesOverride: BackendServices | null = null;

export const getBackendServices = async (): Promise<BackendServices> => {
  if (servicesOverride) {
    return servicesOverride;
  }

  if (!servicesPromise) {
    servicesPromise = createBackendServices();
  }

  return servicesPromise;
};

export const setBackendServicesForTests = (services: BackendServices | null): void => {
  servicesOverride = services;
  servicesPromise = services ? Promise.resolve(services) : null;
};

export const resetBackendServicesRuntime = (): void => {
  servicesOverride = null;
  servicesPromise = null;
};
