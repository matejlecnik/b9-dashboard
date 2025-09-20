export interface TagOption {
  value: string
  label: string
  category: string
  subcategory: string
}

export interface TagCategory {
  name: string
  label: string
  subcategories: {
    name: string
    label: string
    tags: TagOption[]
  }[]
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    name: 'physical',
    label: 'Physical Attributes',
    subcategories: [
      {
        name: 'body_type',
        label: 'Body Size/Type',
        tags: [
          { value: 'physical:body_type:petite', label: 'Petite', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:slim', label: 'Slim', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:athletic', label: 'Athletic', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:average', label: 'Average', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:curvy', label: 'Curvy', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:thick', label: 'Thick', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:slim_thick', label: 'Slim Thick', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:bbw', label: 'BBW', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:ssbbw', label: 'SSBBW', category: 'physical', subcategory: 'body_type' },
          { value: 'physical:body_type:chubby', label: 'Chubby', category: 'physical', subcategory: 'body_type' }
        ]
      },
      {
        name: 'hair',
        label: 'Hair',
        tags: [
          { value: 'physical:hair:blonde', label: 'Blonde', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:brunette', label: 'Brunette', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:redhead', label: 'Redhead', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:black', label: 'Black Hair', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:colored', label: 'Colored', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:short', label: 'Short', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:long', label: 'Long', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:curly', label: 'Curly', category: 'physical', subcategory: 'hair' },
          { value: 'physical:hair:straight', label: 'Straight', category: 'physical', subcategory: 'hair' }
        ]
      },
      {
        name: 'skin',
        label: 'Skin Tone',
        tags: [
          { value: 'physical:skin:pale', label: 'Pale', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:fair', label: 'Fair', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:tan', label: 'Tan', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:olive', label: 'Olive', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:brown', label: 'Brown', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:dark', label: 'Dark', category: 'physical', subcategory: 'skin' },
          { value: 'physical:skin:ebony', label: 'Ebony', category: 'physical', subcategory: 'skin' }
        ]
      },
      {
        name: 'mod',
        label: 'Modifications',
        tags: [
          { value: 'physical:mod:tattoos', label: 'Tattoos', category: 'physical', subcategory: 'mod' },
          { value: 'physical:mod:piercings', label: 'Piercings', category: 'physical', subcategory: 'mod' },
          { value: 'physical:mod:stretched', label: 'Stretched', category: 'physical', subcategory: 'mod' },
          { value: 'physical:mod:natural', label: 'Natural', category: 'physical', subcategory: 'mod' },
          { value: 'physical:mod:implants', label: 'Implants', category: 'physical', subcategory: 'mod' },
          { value: 'physical:mod:bimbo', label: 'Bimbo', category: 'physical', subcategory: 'mod' }
        ]
      },
      {
        name: 'feature',
        label: 'Facial/Features',
        tags: [
          { value: 'physical:feature:freckles', label: 'Freckles', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:glasses', label: 'Glasses', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:braces', label: 'Braces', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:dimples', label: 'Dimples', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:eyes_blue', label: 'Blue Eyes', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:eyes_green', label: 'Green Eyes', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:eyes_brown', label: 'Brown Eyes', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:lips_full', label: 'Full Lips', category: 'physical', subcategory: 'feature' },
          { value: 'physical:feature:gap_teeth', label: 'Gap Teeth', category: 'physical', subcategory: 'feature' }
        ]
      },
      {
        name: 'age_look',
        label: 'Age Appearance',
        tags: [
          { value: 'physical:age_look:teen', label: 'Teen Look', category: 'physical', subcategory: 'age_look' },
          { value: 'physical:age_look:mature', label: 'Mature', category: 'physical', subcategory: 'age_look' },
          { value: 'physical:age_look:milf', label: 'MILF', category: 'physical', subcategory: 'age_look' },
          { value: 'physical:age_look:gilf', label: 'GILF', category: 'physical', subcategory: 'age_look' }
        ]
      }
    ]
  },
  {
    name: 'body',
    label: 'Body Focus',
    subcategories: [
      {
        name: 'ass',
        label: 'Ass/Booty',
        tags: [
          { value: 'body:ass:general', label: 'General', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:big', label: 'Big', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:small', label: 'Small', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:bubble', label: 'Bubble', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:pawg', label: 'PAWG', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:paag', label: 'PAAG', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:pabg', label: 'PABG', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:jiggly', label: 'Jiggly', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:twerk', label: 'Twerk', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:thong', label: 'Thong', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:spread', label: 'Spread', category: 'body', subcategory: 'ass' },
          { value: 'body:ass:bent_over', label: 'Bent Over', category: 'body', subcategory: 'ass' }
        ]
      },
      {
        name: 'breasts',
        label: 'Breasts/Chest',
        tags: [
          { value: 'body:breasts:small', label: 'Small (A-B)', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:medium', label: 'Medium (C-D)', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:large', label: 'Large (DD+)', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:huge', label: 'Huge', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:natural', label: 'Natural', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:enhanced', label: 'Enhanced', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:perky', label: 'Perky', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:saggy', label: 'Saggy', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:flat', label: 'Flat', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:puffy', label: 'Puffy Nipples', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:pierced', label: 'Pierced', category: 'body', subcategory: 'breasts' },
          { value: 'body:breasts:lactating', label: 'Lactating', category: 'body', subcategory: 'breasts' }
        ]
      },
      {
        name: 'legs',
        label: 'Legs/Lower Body',
        tags: [
          { value: 'body:legs:general', label: 'General', category: 'body', subcategory: 'legs' },
          { value: 'body:legs:thick_thighs', label: 'Thick Thighs', category: 'body', subcategory: 'legs' },
          { value: 'body:legs:thin_legs', label: 'Thin Legs', category: 'body', subcategory: 'legs' },
          { value: 'body:legs:thigh_gap', label: 'Thigh Gap', category: 'body', subcategory: 'legs' },
          { value: 'body:legs:calves', label: 'Calves', category: 'body', subcategory: 'legs' },
          { value: 'body:legs:stockings', label: 'Stockings', category: 'body', subcategory: 'legs' }
        ]
      },
      {
        name: 'feet',
        label: 'Feet',
        tags: [
          { value: 'body:feet:general', label: 'General', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:soles', label: 'Soles', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:toes', label: 'Toes', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:arches', label: 'Arches', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:dirty', label: 'Dirty', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:worship', label: 'Worship', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:footjob', label: 'Footjob', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:heels', label: 'High Heels', category: 'body', subcategory: 'feet' },
          { value: 'body:feet:barefoot', label: 'Barefoot', category: 'body', subcategory: 'feet' }
        ]
      },
      {
        name: 'core',
        label: 'Core/Torso',
        tags: [
          { value: 'body:core:abs', label: 'Abs', category: 'body', subcategory: 'core' },
          { value: 'body:core:belly', label: 'Belly', category: 'body', subcategory: 'core' },
          { value: 'body:core:hips', label: 'Hips', category: 'body', subcategory: 'core' },
          { value: 'body:core:hip_bones', label: 'Hip Bones', category: 'body', subcategory: 'core' },
          { value: 'body:core:back', label: 'Back', category: 'body', subcategory: 'core' },
          { value: 'body:core:sideboob', label: 'Sideboob', category: 'body', subcategory: 'core' },
          { value: 'body:core:underboob', label: 'Underboob', category: 'body', subcategory: 'core' },
          { value: 'body:core:cleavage', label: 'Cleavage', category: 'body', subcategory: 'core' }
        ]
      },
      {
        name: 'pussy',
        label: 'Intimate Areas',
        tags: [
          { value: 'body:pussy:general', label: 'General', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:shaved', label: 'Shaved', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:hairy', label: 'Hairy', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:lips', label: 'Prominent Lips', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:innie', label: 'Innie', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:spread', label: 'Spread', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:mound', label: 'Mound', category: 'body', subcategory: 'pussy' },
          { value: 'body:pussy:cameltoe', label: 'Cameltoe', category: 'body', subcategory: 'pussy' }
        ]
      },
      {
        name: 'full',
        label: 'Full Body',
        tags: [
          { value: 'body:full:general', label: 'General', category: 'body', subcategory: 'full' },
          { value: 'body:full:nude', label: 'Nude', category: 'body', subcategory: 'full' },
          { value: 'body:full:artistic', label: 'Artistic', category: 'body', subcategory: 'full' },
          { value: 'body:full:curves', label: 'Curves', category: 'body', subcategory: 'full' },
          { value: 'body:full:from_behind', label: 'From Behind', category: 'body', subcategory: 'full' },
          { value: 'body:full:mirror', label: 'Mirror', category: 'body', subcategory: 'full' }
        ]
      },
      {
        name: 'other',
        label: 'Other Body Parts',
        tags: [
          { value: 'body:face:selfie', label: 'Face Selfie', category: 'body', subcategory: 'face' },
          { value: 'body:face:pretty', label: 'Pretty Face', category: 'body', subcategory: 'face' },
          { value: 'body:face:cute', label: 'Cute Face', category: 'body', subcategory: 'face' },
          { value: 'body:lips:general', label: 'Lips', category: 'body', subcategory: 'lips' },
          { value: 'body:tongue:out', label: 'Tongue Out', category: 'body', subcategory: 'tongue' },
          { value: 'body:hands:general', label: 'Hands', category: 'body', subcategory: 'hands' },
          { value: 'body:armpits:general', label: 'Armpits', category: 'body', subcategory: 'armpits' }
        ]
      }
    ]
  },
  {
    name: 'demo',
    label: 'Demographics',
    subcategories: [
      {
        name: 'age',
        label: 'Age Groups',
        tags: [
          { value: 'demo:age:teen', label: '18-22', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:college', label: 'College Age', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:twenties', label: '23-29', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:thirties', label: '30-39', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:milf', label: 'MILF Age', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:mature', label: '40-49', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:gilf', label: '50+', category: 'demo', subcategory: 'age' },
          { value: 'demo:age:barely_legal', label: 'Barely Legal', category: 'demo', subcategory: 'age' }
        ]
      },
      {
        name: 'ethnicity',
        label: 'Ethnicity/Race',
        tags: [
          { value: 'demo:ethnicity:white', label: 'White', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:asian', label: 'Asian', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:latina', label: 'Latina', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:ebony', label: 'Ebony', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:indian', label: 'Indian', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:middle_eastern', label: 'Middle Eastern', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:mixed', label: 'Mixed', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:native', label: 'Native', category: 'demo', subcategory: 'ethnicity' },
          { value: 'demo:ethnicity:pacific', label: 'Pacific Islander', category: 'demo', subcategory: 'ethnicity' }
        ]
      },
      {
        name: 'asian',
        label: 'Asian Specific',
        tags: [
          { value: 'demo:asian:japanese', label: 'Japanese', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:chinese', label: 'Chinese', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:korean', label: 'Korean', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:thai', label: 'Thai', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:filipina', label: 'Filipina', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:vietnamese', label: 'Vietnamese', category: 'demo', subcategory: 'asian' },
          { value: 'demo:asian:indonesian', label: 'Indonesian', category: 'demo', subcategory: 'asian' }
        ]
      },
      {
        name: 'geo',
        label: 'Geographic',
        tags: [
          { value: 'demo:geo:american', label: 'American', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:canadian', label: 'Canadian', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:british', label: 'British', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:european', label: 'European', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:australian', label: 'Australian', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:latin_american', label: 'Latin American', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:russian', label: 'Russian', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:scandinavian', label: 'Scandinavian', category: 'demo', subcategory: 'geo' },
          { value: 'demo:geo:brazilian', label: 'Brazilian', category: 'demo', subcategory: 'geo' }
        ]
      }
    ]
  },
  {
    name: 'style',
    label: 'Style & Aesthetic',
    subcategories: [
      {
        name: 'clothing',
        label: 'Clothing/Outfits',
        tags: [
          { value: 'style:clothing:lingerie', label: 'Lingerie', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:bikini', label: 'Bikini', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:yoga_pants', label: 'Yoga Pants', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:jeans', label: 'Jeans', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:dress', label: 'Dress', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:skirt', label: 'Skirt', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:shorts', label: 'Shorts', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:stockings', label: 'Stockings', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:socks', label: 'Socks', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:heels', label: 'High Heels', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:boots', label: 'Boots', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:costume', label: 'Costume', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:uniform', label: 'Uniform', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:latex', label: 'Latex', category: 'style', subcategory: 'clothing' },
          { value: 'style:clothing:fishnets', label: 'Fishnets', category: 'style', subcategory: 'clothing' }
        ]
      },
      {
        name: 'nudity',
        label: 'Nudity Level',
        tags: [
          { value: 'style:nudity:clothed', label: 'Clothed', category: 'style', subcategory: 'nudity' },
          { value: 'style:nudity:teasing', label: 'Teasing', category: 'style', subcategory: 'nudity' },
          { value: 'style:nudity:topless', label: 'Topless', category: 'style', subcategory: 'nudity' },
          { value: 'style:nudity:bottomless', label: 'Bottomless', category: 'style', subcategory: 'nudity' },
          { value: 'style:nudity:nude', label: 'Nude', category: 'style', subcategory: 'nudity' },
          { value: 'style:nudity:explicit', label: 'Explicit', category: 'style', subcategory: 'nudity' }
        ]
      },
      {
        name: 'aesthetic',
        label: 'Aesthetic/Vibe',
        tags: [
          { value: 'style:aesthetic:cute', label: 'Cute', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:sexy', label: 'Sexy', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:innocent', label: 'Innocent', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:slutty', label: 'Slutty', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:elegant', label: 'Elegant', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:girl_next_door', label: 'Girl Next Door', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:trashy', label: 'Trashy', category: 'style', subcategory: 'aesthetic' },
          { value: 'style:aesthetic:artistic', label: 'Artistic', category: 'style', subcategory: 'aesthetic' }
        ]
      },
      {
        name: 'subculture',
        label: 'Subcultures',
        tags: [
          { value: 'style:subculture:goth', label: 'Goth', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:alt', label: 'Alternative', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:emo', label: 'Emo', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:punk', label: 'Punk', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:egirl', label: 'E-Girl', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:vsco', label: 'VSCO Girl', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:bimbo', label: 'Bimbo', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:tomboy', label: 'Tomboy', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:princess', label: 'Princess', category: 'style', subcategory: 'subculture' },
          { value: 'style:subculture:hippie', label: 'Hippie', category: 'style', subcategory: 'subculture' }
        ]
      },
      {
        name: 'cosplay',
        label: 'Cosplay/Fantasy',
        tags: [
          { value: 'style:cosplay:anime', label: 'Anime', category: 'style', subcategory: 'cosplay' },
          { value: 'style:cosplay:gaming', label: 'Gaming', category: 'style', subcategory: 'cosplay' },
          { value: 'style:cosplay:superhero', label: 'Superhero', category: 'style', subcategory: 'cosplay' },
          { value: 'style:cosplay:disney', label: 'Disney', category: 'style', subcategory: 'cosplay' },
          { value: 'style:cosplay:generic', label: 'Generic', category: 'style', subcategory: 'cosplay' }
        ]
      }
    ]
  },
  {
    name: 'theme',
    label: 'Content Themes',
    subcategories: [
      {
        name: 'dynamic',
        label: 'Power Dynamics',
        tags: [
          { value: 'theme:dynamic:dom', label: 'Dominant', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:sub', label: 'Submissive', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:switch', label: 'Switch', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:brat', label: 'Brat', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:daddy', label: 'Daddy', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:mommy', label: 'Mommy', category: 'theme', subcategory: 'dynamic' },
          { value: 'theme:dynamic:master', label: 'Master/Slave', category: 'theme', subcategory: 'dynamic' }
        ]
      },
      {
        name: 'roleplay',
        label: 'Roleplay Scenarios',
        tags: [
          { value: 'theme:roleplay:ddlg', label: 'DDLG', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:student', label: 'Student/Teacher', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:nurse', label: 'Nurse', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:secretary', label: 'Secretary', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:maid', label: 'Maid', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:stepmom', label: 'Step-Family', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:cheating', label: 'Cheating', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:virgin', label: 'Virgin', category: 'theme', subcategory: 'roleplay' },
          { value: 'theme:roleplay:religious', label: 'Religious', category: 'theme', subcategory: 'roleplay' }
        ]
      },
      {
        name: 'fetish',
        label: 'Fetish/Kink',
        tags: [
          { value: 'theme:fetish:bdsm', label: 'BDSM', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:breeding', label: 'Breeding', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:cnc', label: 'CNC', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:humiliation', label: 'Humiliation', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:worship', label: 'Worship', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:collar', label: 'Collar', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:petplay', label: 'Pet Play', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:ahegao', label: 'Ahegao', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:joi', label: 'JOI', category: 'theme', subcategory: 'fetish' },
          { value: 'theme:fetish:cuckold', label: 'Cuckold', category: 'theme', subcategory: 'fetish' }
        ]
      },
      {
        name: 'lifestyle',
        label: 'Lifestyle Themes',
        tags: [
          { value: 'theme:lifestyle:housewife', label: 'Housewife', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:hotwife', label: 'Hotwife', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:gym', label: 'Gym', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:yoga', label: 'Yoga', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:outdoor', label: 'Outdoor', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:beach', label: 'Beach', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:country', label: 'Country', category: 'theme', subcategory: 'lifestyle' },
          { value: 'theme:lifestyle:office', label: 'Office', category: 'theme', subcategory: 'lifestyle' }
        ]
      },
      {
        name: 'mood',
        label: 'Content Mood',
        tags: [
          { value: 'theme:mood:romantic', label: 'Romantic', category: 'theme', subcategory: 'mood' },
          { value: 'theme:mood:hardcore', label: 'Hardcore', category: 'theme', subcategory: 'mood' },
          { value: 'theme:mood:playful', label: 'Playful', category: 'theme', subcategory: 'mood' },
          { value: 'theme:mood:intimate', label: 'Intimate', category: 'theme', subcategory: 'mood' },
          { value: 'theme:mood:aggressive', label: 'Aggressive', category: 'theme', subcategory: 'mood' },
          { value: 'theme:mood:gentle', label: 'Gentle', category: 'theme', subcategory: 'mood' }
        ]
      }
    ]
  },
  {
    name: 'platform',
    label: 'Platform & Engagement',
    subcategories: [
      {
        name: 'type',
        label: 'Content Type',
        tags: [
          { value: 'platform:type:selfie', label: 'Selfie', category: 'platform', subcategory: 'type' },
          { value: 'platform:type:amateur', label: 'Amateur', category: 'platform', subcategory: 'type' },
          { value: 'platform:type:professional', label: 'Professional', category: 'platform', subcategory: 'type' },
          { value: 'platform:type:oc', label: 'OC Only', category: 'platform', subcategory: 'type' },
          { value: 'platform:type:verified', label: 'Verified Only', category: 'platform', subcategory: 'type' },
          { value: 'platform:type:candid', label: 'Candid', category: 'platform', subcategory: 'type' }
        ]
      },
      {
        name: 'of',
        label: 'OnlyFans Related',
        tags: [
          { value: 'platform:of:promo', label: 'OF Promo', category: 'platform', subcategory: 'of' },
          { value: 'platform:of:friendly', label: 'OF Friendly', category: 'platform', subcategory: 'of' },
          { value: 'platform:of:restricted', label: 'No OF', category: 'platform', subcategory: 'of' },
          { value: 'platform:of:sellers', label: 'Sellers OK', category: 'platform', subcategory: 'of' },
          { value: 'platform:of:no_sellers', label: 'No Sellers', category: 'platform', subcategory: 'of' }
        ]
      },
      {
        name: 'interaction',
        label: 'Interaction Style',
        tags: [
          { value: 'platform:interaction:rating', label: 'Rate Me', category: 'platform', subcategory: 'interaction' },
          { value: 'platform:interaction:request', label: 'Requests', category: 'platform', subcategory: 'interaction' },
          { value: 'platform:interaction:tribute', label: 'Tribute', category: 'platform', subcategory: 'interaction' },
          { value: 'platform:interaction:roleplay', label: 'Roleplay', category: 'platform', subcategory: 'interaction' },
          { value: 'platform:interaction:discussion', label: 'Discussion', category: 'platform', subcategory: 'interaction' },
          { value: 'platform:interaction:showcase', label: 'Showcase', category: 'platform', subcategory: 'interaction' }
        ]
      }
    ]
  }
]

// Helper function to get all tags as flat array
export function getAllTags(): TagOption[] {
  const tags: TagOption[] = []
  TAG_CATEGORIES.forEach(category => {
    category.subcategories.forEach(subcategory => {
      tags.push(...subcategory.tags)
    })
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

  const tags: TagOption[] = []
  category.subcategories.forEach(subcategory => {
    tags.push(...subcategory.tags)
  })
  return tags
}