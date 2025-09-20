export interface TagOption {
  value: string
  label: string
  category: string
}

export interface TagCategory {
  name: string
  label: string
  tags: TagOption[]
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    name: 'niche',
    label: 'Content/Niche',
    tags: [
      { value: 'niche:cosplay', label: 'Cosplay', category: 'niche' },
      { value: 'niche:gaming', label: 'Gaming', category: 'niche' },
      { value: 'niche:anime', label: 'Anime', category: 'niche' },
      { value: 'niche:fitness', label: 'Fitness', category: 'niche' },
      { value: 'niche:yoga', label: 'Yoga', category: 'niche' },
      { value: 'niche:outdoors', label: 'Outdoors', category: 'niche' },
      { value: 'niche:bdsm', label: 'BDSM', category: 'niche' },
      { value: 'niche:feet', label: 'Feet', category: 'niche' },
      { value: 'niche:amateur', label: 'Amateur', category: 'niche' },
      { value: 'niche:verified', label: 'Verified', category: 'niche' },
      { value: 'niche:teen', label: 'Teen (18+)', category: 'niche' },
      { value: 'niche:selfie', label: 'Selfie', category: 'niche' },
      { value: 'niche:sellers', label: 'Sellers', category: 'niche' },
      { value: 'niche:cnc', label: 'CNC', category: 'niche' },
      { value: 'niche:daddy', label: 'Daddy/DDLG', category: 'niche' },
      { value: 'niche:voyeur', label: 'Voyeur', category: 'niche' },
      { value: 'niche:rating', label: 'Rating', category: 'niche' },
      { value: 'niche:general', label: 'General', category: 'niche' }
    ]
  },
  {
    name: 'focus',
    label: 'Body Focus',
    tags: [
      { value: 'focus:breasts', label: 'Breasts', category: 'focus' },
      { value: 'focus:ass', label: 'Ass', category: 'focus' },
      { value: 'focus:pussy', label: 'Pussy', category: 'focus' },
      { value: 'focus:legs', label: 'Legs', category: 'focus' },
      { value: 'focus:thighs', label: 'Thighs', category: 'focus' },
      { value: 'focus:feet', label: 'Feet', category: 'focus' },
      { value: 'focus:face', label: 'Face', category: 'focus' },
      { value: 'focus:belly', label: 'Belly', category: 'focus' },
      { value: 'focus:curves', label: 'Curves', category: 'focus' },
      { value: 'focus:full_body', label: 'Full Body', category: 'focus' }
    ]
  },
  {
    name: 'body',
    label: 'Body Type',
    tags: [
      { value: 'body:petite', label: 'Petite', category: 'body' },
      { value: 'body:slim', label: 'Slim', category: 'body' },
      { value: 'body:athletic', label: 'Athletic', category: 'body' },
      { value: 'body:average', label: 'Average', category: 'body' },
      { value: 'body:curvy', label: 'Curvy', category: 'body' },
      { value: 'body:thick', label: 'Thick', category: 'body' },
      { value: 'body:slim_thick', label: 'Slim Thick', category: 'body' },
      { value: 'body:bbw', label: 'BBW', category: 'body' },
      { value: 'body:ssbbw', label: 'SSBBW', category: 'body' }
    ]
  },
  {
    name: 'ass',
    label: 'Ass Specific',
    tags: [
      { value: 'ass:small', label: 'Small', category: 'ass' },
      { value: 'ass:bubble', label: 'Bubble', category: 'ass' },
      { value: 'ass:pawg', label: 'PAWG', category: 'ass' },
      { value: 'ass:thick', label: 'Thick', category: 'ass' },
      { value: 'ass:jiggly', label: 'Jiggly', category: 'ass' }
    ]
  },
  {
    name: 'breasts',
    label: 'Breasts Specific',
    tags: [
      { value: 'breasts:small', label: 'Small (A-B)', category: 'breasts' },
      { value: 'breasts:medium', label: 'Medium (C-D)', category: 'breasts' },
      { value: 'breasts:large', label: 'Large (DD-DDD)', category: 'breasts' },
      { value: 'breasts:huge', label: 'Huge', category: 'breasts' },
      { value: 'breasts:natural', label: 'Natural', category: 'breasts' },
      { value: 'breasts:enhanced', label: 'Enhanced', category: 'breasts' },
      { value: 'breasts:perky', label: 'Perky', category: 'breasts' }
    ]
  },
  {
    name: 'age',
    label: 'Age Group',
    tags: [
      { value: 'age:teen', label: 'Teen (18-19)', category: 'age' },
      { value: 'age:college', label: 'College (20-24)', category: 'age' },
      { value: 'age:milf', label: 'MILF (30-45)', category: 'age' },
      { value: 'age:mature', label: 'Mature (40-49)', category: 'age' },
      { value: 'age:gilf', label: 'GILF (50+)', category: 'age' }
    ]
  },
  {
    name: 'ethnicity',
    label: 'Ethnicity',
    tags: [
      { value: 'ethnicity:asian', label: 'Asian', category: 'ethnicity' },
      { value: 'ethnicity:latina', label: 'Latina', category: 'ethnicity' },
      { value: 'ethnicity:ebony', label: 'Ebony', category: 'ethnicity' },
      { value: 'ethnicity:white', label: 'White', category: 'ethnicity' },
      { value: 'ethnicity:indian', label: 'Indian', category: 'ethnicity' },
      { value: 'ethnicity:middle_eastern', label: 'Middle Eastern', category: 'ethnicity' },
      { value: 'ethnicity:mixed', label: 'Mixed', category: 'ethnicity' }
    ]
  },
  {
    name: 'style',
    label: 'Style/Aesthetic',
    tags: [
      { value: 'style:alt', label: 'Alternative', category: 'style' },
      { value: 'style:goth', label: 'Goth', category: 'style' },
      { value: 'style:egirl', label: 'E-Girl', category: 'style' },
      { value: 'style:tattooed', label: 'Tattooed', category: 'style' },
      { value: 'style:pierced', label: 'Pierced', category: 'style' },
      { value: 'style:natural', label: 'Natural', category: 'style' },
      { value: 'style:bimbo', label: 'Bimbo', category: 'style' },
      { value: 'style:tomboy', label: 'Tomboy', category: 'style' },
      { value: 'style:femdom', label: 'Femdom', category: 'style' },
      { value: 'style:submissive', label: 'Submissive', category: 'style' },
      { value: 'style:cosplay', label: 'Cosplay', category: 'style' },
      { value: 'style:lingerie', label: 'Lingerie', category: 'style' },
      { value: 'style:uniform', label: 'Uniform', category: 'style' }
    ]
  },
  {
    name: 'hair',
    label: 'Hair',
    tags: [
      { value: 'hair:blonde', label: 'Blonde', category: 'hair' },
      { value: 'hair:redhead', label: 'Redhead', category: 'hair' },
      { value: 'hair:brunette', label: 'Brunette', category: 'hair' },
      { value: 'hair:colored', label: 'Colored', category: 'hair' }
    ]
  },
  {
    name: 'special',
    label: 'Special Attributes',
    tags: [
      { value: 'special:hairy', label: 'Hairy', category: 'special' },
      { value: 'special:shaved', label: 'Shaved', category: 'special' },
      { value: 'special:pregnant', label: 'Pregnant', category: 'special' },
      { value: 'special:lactating', label: 'Lactating', category: 'special' },
      { value: 'special:squirter', label: 'Squirter', category: 'special' },
      { value: 'special:flexible', label: 'Flexible', category: 'special' },
      { value: 'special:tall', label: 'Tall (5\'10"+)', category: 'special' },
      { value: 'special:short', label: 'Short (<5\'2")', category: 'special' },
      { value: 'special:pawg', label: 'PAWG', category: 'special' },
      { value: 'special:breeding', label: 'Breeding Kink', category: 'special' },
      { value: 'special:daddy', label: 'Daddy Themes', category: 'special' },
      { value: 'special:slutty', label: 'Slut Themes', category: 'special' },
      { value: 'special:clothed', label: 'Clothed/Teasing', category: 'special' },
      { value: 'special:bent_over', label: 'Bent Over', category: 'special' }
    ]
  },
  {
    name: 'content',
    label: 'Content Type',
    tags: [
      { value: 'content:oc', label: 'Original Content', category: 'content' },
      { value: 'content:selfies', label: 'Selfies', category: 'content' },
      { value: 'content:professional', label: 'Professional', category: 'content' }
    ]
  }
]

// Helper function to get all tags as flat array
export function getAllTags(): TagOption[] {
  const tags: TagOption[] = []
  TAG_CATEGORIES.forEach(category => {
    tags.push(...category.tags)
  })
  return tags
}

// Helper function to search tags
export function searchTags(query: string): TagOption[] {
  const normalizedQuery = query.toLowerCase()
  return getAllTags().filter(tag =>
    tag.label.toLowerCase().includes(normalizedQuery) ||
    tag.value.toLowerCase().includes(normalizedQuery)
  )
}

// Helper function to get tags by category
export function getTagsByCategory(categoryName: string): TagOption[] {
  const category = TAG_CATEGORIES.find(c => c.name === categoryName)
  if (!category) return []
  return category.tags
}

// Helper to find tag by value
export function findTagByValue(value: string): TagOption | undefined {
  return getAllTags().find(tag => tag.value === value)
}

// Helper to get tag label
export function getTagLabel(value: string): string {
  const tag = findTagByValue(value)
  return tag ? tag.label : value
}