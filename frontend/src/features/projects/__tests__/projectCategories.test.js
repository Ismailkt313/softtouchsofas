import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_PROJECT_CATEGORY_NAMES,
  findDuplicateProjectCategory,
  normalizeProjectCategoryWhitespace,
  validateProjectCategoryInput,
} from '../utils/projectCategoryValidation.js'

test('DEFAULT_PROJECT_CATEGORY_NAMES preserves the 4 default categories', () => {
  assert.deepEqual(DEFAULT_PROJECT_CATEGORY_NAMES, [
    'Modular Sofa',
    'Curtains',
    'Armchair',
    'Bespoke Interior',
  ])
})

test('normalizes category whitespace correctly', () => {
  assert.equal(normalizeProjectCategoryWhitespace('  Modular   Sofa  '), 'Modular Sofa')
  assert.equal(normalizeProjectCategoryWhitespace(null), '')
})

test('findDuplicateProjectCategory detects duplicates case-insensitively and whitespace-agnostic', () => {
  const categories = [
    { id: '1', name: 'Modular Sofa' },
    'Curtains',
    'Armchair',
    'Bespoke Interior',
    { id: '2', name: 'Luxury Recliner' },
  ]

  assert.ok(findDuplicateProjectCategory(categories, '  modular sofa  '))
  assert.ok(findDuplicateProjectCategory(categories, 'LUXURY RECLINER'))
  assert.ok(findDuplicateProjectCategory(categories, 'curtains'))
  assert.strictEqual(findDuplicateProjectCategory(categories, 'New Custom Category'), null)
})

test('validateProjectCategoryInput checks emptiness, length limits, and duplicate status', () => {
  const categories = ['Modular Sofa', 'Curtains', 'Armchair', 'Bespoke Interior']

  assert.equal(validateProjectCategoryInput('', categories), 'Category name is required.')
  assert.equal(validateProjectCategoryInput('   ', categories), 'Category name is required.')
  assert.equal(validateProjectCategoryInput('a', categories), 'Category name must be at least 2 characters.')
  assert.equal(validateProjectCategoryInput('x'.repeat(101), categories), 'Category name cannot exceed 100 characters.')
  assert.equal(validateProjectCategoryInput('modular sofa', categories), "Category 'modular sofa' already exists.")
  assert.strictEqual(validateProjectCategoryInput('Daybed & Chaise', categories), null)
})

test('Dropdown options generation includes + Add Custom Category at the bottom', () => {
  const categories = ['Modular Sofa', 'Curtains', 'Armchair', 'Bespoke Interior']
  const options = categories.map((cat) => ({
    value: cat,
    label: cat,
  }))
  options.push({
    value: '__add_custom_category__',
    label: '+ Add Custom Category',
    isCreateAction: true,
  })

  assert.equal(options.length, 5)
  assert.equal(options[4].value, '__add_custom_category__')
  assert.equal(options[4].label, '+ Add Custom Category')
  assert.equal(options[4].isCreateAction, true)
})
