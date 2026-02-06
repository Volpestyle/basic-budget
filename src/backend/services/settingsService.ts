import type { SettingsService } from '../../types/services';
import type { Settings } from '../../types/domain';
import type { BackendContext } from './context';

export class SettingsServiceImpl implements SettingsService {
  constructor(private readonly ctx: BackendContext) {}

  async getSettings(): Promise<Settings> {
    return this.ctx.repos.settings.get();
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return this.ctx.repos.settings.update(patch);
  }
}
