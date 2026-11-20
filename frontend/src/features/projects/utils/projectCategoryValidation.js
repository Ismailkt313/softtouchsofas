export const DEFAULT_PROJECT_CATEGORY_NAMES = Object.freeze([
  'Modular Sofa',
  'Curtains',
  'Armchair',
  'Bespoke Interior',
])

export function normalizeProjectCategoryWhitespace(raw) {
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.trim().replace(/\s+/g, ' ')
}

export function findDuplicateProjectCategory(categories, newCategoryName) {
  const cleanTarget = normalizeProjectCategoryWhitespace(newCategoryName).toLowerCase()
  if (!cleanTarget || !Array.isArray(categories)) {
    return null
  }

  return (
    categories.find((cat) => {
      const name = typeof cat === 'object' && cat?.name ? cat.name : String(cat)
      return normalizeProjectCategoryWhitespace(name).toLowerCase() === cleanTarget
    }) || null
  )
}

export function validateProjectCategoryInput(name, categories = []) {
  const cleanName = normalizeProjectCategoryWhitespace(name)
  if (!cleanName) {
    return 'Category name is required.'
  }
  if (cleanName.length < 2) {
    return 'Category name must be at least 2 characters.'
  }
  if (cleanName.length > 100) {
    return 'Category name cannot exceed 100 characters.'
  }
  if (findDuplicateProjectCategory(categories, cleanName)) {
    return `Category '${cleanName}' already exists.`
  }
  return null
}
