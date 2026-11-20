import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROJECT_CATEGORIES,
  DuplicateProjectCategoryError,
  ProjectCategoryModel,
  ProjectCounterModel,
  ProjectCostAlertModel,
  ProjectActivityWarningModel,
  ProjectModel,
  ProjectRepository,
  ProjectService,
  sharedProjectCategoryMemoryStore,
  sharedProjectCounterMemoryStore,
  sharedProjectMemoryStore,
  validateCreateProjectCategoryDto,
  validateCreateProjectDto,
  validateUpdateProjectDto,
  validateListProjectsDto,
} from '../index';

test('validateCreateProjectCategoryDto rejects empty or invalid categories', () => {
  const emptyRes = validateCreateProjectCategoryDto({});
  assert.strictEqual(emptyRes.isValid, false);
  assert.ok(emptyRes.errors.name);

  const whitespaceRes = validateCreateProjectCategoryDto({ name: '   ' });
  assert.strictEqual(whitespaceRes.isValid, false);
  assert.ok(whitespaceRes.errors.name);

  const shortRes = validateCreateProjectCategoryDto({ name: 'a' });
  assert.strictEqual(shortRes.isValid, false);
  assert.ok(shortRes.errors.name);

  const tooLongRes = validateCreateProjectCategoryDto({ name: 'x'.repeat(101) });
  assert.strictEqual(tooLongRes.isValid, false);
  assert.ok(tooLongRes.errors.name);

  const validRes = validateCreateProjectCategoryDto({ name: '  Recliner Sofa  ' });
  assert.strictEqual(validRes.isValid, true);
  assert.strictEqual(validRes.value?.name, 'Recliner Sofa');
});

test('ProjectRepository & Service handles predefined and custom categories', async () => {
  sharedProjectCategoryMemoryStore.clear();
  sharedProjectMemoryStore.clear();
  sharedProjectCounterMemoryStore.clear();

  const repository = new ProjectRepository(
    ProjectModel,
    ProjectCounterModel,
    ProjectCostAlertModel,
    ProjectActivityWarningModel,
    ProjectCategoryModel,
  );
  const service = new ProjectService(repository);

  // 1. Initial list has predefined categories
  const initialCategories = await service.listCategories();
  assert.ok(initialCategories.length >= DEFAULT_PROJECT_CATEGORIES.length);
  for (const def of DEFAULT_PROJECT_CATEGORIES) {
    assert.ok(
      initialCategories.some((c) => c.name === def && c.isPredefined === true),
      `Missing predefined category ${def}`,
    );
  }

  // 2. Create custom category
  const created = await service.createCategory(
    { name: 'Luxury Recliner' },
    'tester@example.com',
  );
  assert.strictEqual(created.name, 'Luxury Recliner');
  assert.strictEqual(created.isPredefined, false);
  assert.strictEqual(created.isActive, true);

  // 3. New category is in listCategories
  const updatedCategories = await service.listCategories();
  assert.ok(updatedCategories.some((c) => c.name === 'Luxury Recliner'));

  // 4. Case-insensitive duplicate check prevents duplicate
  await assert.rejects(
    async () => {
      await service.createCategory(
        { name: '  luxury recliner  ' },
        'tester@example.com',
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof DuplicateProjectCategoryError);
      return true;
    },
  );

  // Duplicate of predefined category also rejected
  await assert.rejects(
    async () => {
      await service.createCategory(
        { name: 'modular sofa' },
        'tester@example.com',
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof DuplicateProjectCategoryError);
      return true;
    },
  );

  // 5. Create project using custom category
  const createDto = validateCreateProjectDto({
    name: 'Presidential Suite Sofa',
    clientName: 'Grand Hotel',
    category: 'Luxury Recliner',
    contractValue: 85000,
  });
  assert.strictEqual(createDto.isValid, true);
  assert.strictEqual(createDto.value?.category, 'Luxury Recliner');

  const project = await service.createProject(
    createDto.value!,
    'tester@example.com',
  );
  assert.strictEqual(project.category, 'Luxury Recliner');

  // 6. Update project with another custom category
  const createdSecond = await service.createCategory(
    { name: 'Velvet Drapes' },
    'tester@example.com',
  );
  assert.strictEqual(createdSecond.name, 'Velvet Drapes');

  const updateDto = validateUpdateProjectDto({
    category: 'Velvet Drapes',
  });
  assert.strictEqual(updateDto.isValid, true);
  assert.strictEqual(updateDto.value?.category, 'Velvet Drapes');

  const updatedProject = await service.updateProject(
    project.projectId,
    updateDto.value!,
  );
  assert.strictEqual(updatedProject.category, 'Velvet Drapes');

  // 7. Filtering by custom category
  const listDto = validateListProjectsDto({
    category: 'Velvet Drapes',
  });
  assert.strictEqual(listDto.isValid, true);
  assert.strictEqual(listDto.value?.category, 'Velvet Drapes');

  const listRes = await service.listProjects(listDto.value!);
  assert.strictEqual(listRes.items.length, 1);
  assert.strictEqual(listRes.items[0].category, 'Velvet Drapes');
});

test('ProjectController endpoints for category management', async () => {
  const { ProjectController } = await import('../controller/project.controller');
  const repository = new ProjectRepository(
    ProjectModel,
    ProjectCounterModel,
    ProjectCostAlertModel,
    ProjectActivityWarningModel,
    ProjectCategoryModel,
  );
  const service = new ProjectService(repository);
  const controller = new ProjectController(service);

  // Test listCategories
  let statusCode = 0;
  let responseData: any = null;
  const mockRes: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  };

  await controller.listCategories(
    { user: { email: 'admin@softtouch.com', role: 'admin' } } as any,
    mockRes,
    () => {},
  );
  assert.strictEqual(statusCode, 200);
  assert.ok(Array.isArray(responseData?.categories));

  // Test createCategory
  await controller.createCategory(
    {
      body: { name: 'Outdoor Lounge' },
      user: { email: 'admin@softtouch.com', role: 'admin' },
    } as any,
    mockRes,
    () => {},
  );
  assert.strictEqual(statusCode, 201);
  assert.strictEqual(responseData?.category?.name, 'Outdoor Lounge');

  // Test duplicate createCategory -> 409 Conflict
  await controller.createCategory(
    {
      body: { name: 'outdoor lounge' },
      user: { email: 'admin@softtouch.com', role: 'admin' },
    } as any,
    mockRes,
    () => {},
  );
  assert.strictEqual(statusCode, 409);
  assert.strictEqual(responseData?.error, 'Conflict');

  // Test invalid createCategory -> 400 Bad Request
  await controller.createCategory(
    {
      body: { name: ' ' },
      user: { email: 'admin@softtouch.com', role: 'admin' },
    } as any,
    mockRes,
    () => {},
  );
  assert.strictEqual(statusCode, 400);
  assert.strictEqual(responseData?.error, 'Bad Request');
});
