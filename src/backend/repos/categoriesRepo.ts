import type { Category, TimestampString } from '../../types/domain';
import type { DatabaseAdapter } from '../db/types';
import { asTimestamp } from './shared';

type CategoryRow = {
  id: string;
  name: string;
  kind: 'need' | 'want';
  icon: string;
  color: string;
  archived_at: string | null;
};

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  icon: row.icon,
  color: row.color,
  archivedAt: row.archived_at ? asTimestamp(row.archived_at) : null,
});

export class CategoriesRepo {
  constructor(private readonly db: DatabaseAdapter) {}

  async insert(category: Category): Promise<void> {
    await this.db.run(
      `
      INSERT INTO categories (id, name, kind, icon, color, archived_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [category.id, category.name, category.kind, category.icon, category.color, category.archivedAt],
    );
  }

  async update(category: Category): Promise<void> {
    await this.db.run(
      `
      UPDATE categories
      SET name = ?, kind = ?, icon = ?, color = ?, archived_at = ?
      WHERE id = ?
      `,
      [category.name, category.kind, category.icon, category.color, category.archivedAt, category.id],
    );
  }

  async archive(categoryId: string, archivedAt: TimestampString): Promise<void> {
    await this.db.run('UPDATE categories SET archived_at = ? WHERE id = ?', [archivedAt, categoryId]);
  }

  async getById(id: string): Promise<Category | null> {
    const row = await this.db.getFirst<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
    return row ? mapCategory(row) : null;
  }

  async list(includeArchived = false): Promise<Category[]> {
    const sql = includeArchived
      ? 'SELECT * FROM categories ORDER BY name ASC'
      : 'SELECT * FROM categories WHERE archived_at IS NULL ORDER BY name ASC';
    const rows = await this.db.getAll<CategoryRow>(sql);
    return rows.map(mapCategory);
  }
}
