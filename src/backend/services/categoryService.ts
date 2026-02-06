import type { Category } from '../../types/domain';
import type {
  CategoryService,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../types/services';
import type { BackendContext } from './context';
import { assert, requireValue } from './internal';

export class CategoryServiceImpl implements CategoryService {
  constructor(private readonly ctx: BackendContext) {}

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    assert(Boolean(input.name?.trim()), 'Category name is required');

    const category: Category = {
      id: this.ctx.uuid.next(),
      name: input.name.trim(),
      kind: input.kind,
      icon: input.icon,
      color: input.color,
      archivedAt: null,
    };

    await this.ctx.repos.categories.insert(category);
    return category;
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = requireValue(await this.ctx.repos.categories.getById(id), `Category not found: ${id}`);

    const updated: Category = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      kind: input.kind ?? existing.kind,
      icon: input.icon ?? existing.icon,
      color: input.color ?? existing.color,
    };

    assert(Boolean(updated.name), 'Category name is required');

    await this.ctx.repos.categories.update(updated);
    return updated;
  }

  async archiveCategory(id: string): Promise<void> {
    const existing = requireValue(await this.ctx.repos.categories.getById(id), `Category not found: ${id}`);
    if (existing.archivedAt) {
      return;
    }

    await this.ctx.repos.categories.archive(id, this.ctx.clock.now());
  }

  async getCategory(id: string): Promise<Category | null> {
    return this.ctx.repos.categories.getById(id);
  }

  async listCategories(includeArchived = false): Promise<Category[]> {
    return this.ctx.repos.categories.list(includeArchived);
  }
}
