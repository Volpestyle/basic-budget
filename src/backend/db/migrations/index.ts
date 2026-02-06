import type { Migration } from '../types';
import { migration0001Init } from './0001_init';
import { migration0002Alerts } from './0002_alerts';
import { migration0003ImportMeta } from './0003_import_meta';

export const MIGRATIONS: Migration[] = [migration0001Init, migration0002Alerts, migration0003ImportMeta];
