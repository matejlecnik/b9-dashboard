# Reddit Subreddit Tag Categorization System

## Overview
This document defines the tag hierarchy for categorizing Reddit subreddits for OnlyFans marketing campaigns. The system uses a maximum of 2 tags per subreddit to ensure precise matching and prevent inappropriate model-subreddit pairings.

## Tag Format
Tags follow the format: `category:value` or `category:subcategory`

Examples: `niche:cosplay`, `ethnicity:asian`, `ass:pawg`

## Complete Tag Hierarchy (82 Total Tags)

### 1️⃣ CONTENT/NICHE (14 tags)
*Primary content type or niche focus*

- `niche:cosplay` - Cosplay content
- `niche:gaming` - Gaming related content
- `niche:anime` - Anime/manga related
- `niche:fitness` - Fitness/gym focused
- `niche:yoga` - Yoga specific content
- `niche:outdoors` - Outdoor/public content
- `niche:bdsm` - BDSM/kink content
- `niche:amateur` - Amateur/real content emphasis
- `niche:verified` - Verified accounts only
- `niche:sellers` - For selling services
- `niche:cnc` - CNC/rape fantasy content
- `niche:voyeur` - Upskirt/candid/voyeur
- `niche:rating` - Rating/feedback subs
- `niche:general` - General NSFW content

### 2️⃣ BODY FOCUS (10 tags)
*Primary body part emphasis*

- `focus:breasts` - Breast/chest focused
- `focus:ass` - Ass/booty focused
- `focus:pussy` - Pussy focused
- `focus:legs` - Legs focused
- `focus:thighs` - Thigh specific
- `focus:feet` - Feet focused
- `focus:face` - Face/portrait focused
- `focus:belly` - Belly/tummy focused
- `focus:curves` - Overall curves emphasis
- `focus:full_body` - Full body shots

### 3️⃣ BODY TYPE (9 tags)
*Overall body build*

- `body:petite` - Small frame, under 5'4"
- `body:slim` - Slender build
- `body:athletic` - Fit, toned, muscular
- `body:average` - Medium build
- `body:curvy` - Hourglass figure
- `body:thick` - Fuller figure
- `body:slim_thick` - Slim waist, thick hips/thighs
- `body:bbw` - Big beautiful women
- `body:ssbbw` - Super-sized BBW

### 4️⃣ ASS SPECIFIC (4 tags)
*Specific ass characteristics*

- `ass:small` - Small/cute butts
- `ass:bubble` - Bubble butts
- `ass:big` - Big/thick asses (PAWG)
- `ass:jiggly` - Jiggly/bouncy

### 5️⃣ BREASTS SPECIFIC (7 tags)
*Specific breast characteristics*

- `breasts:small` - A-B cup
- `breasts:medium` - C-D cup
- `breasts:large` - DD-DDD cup
- `breasts:huge` - Massive breasts
- `breasts:natural` - Natural breasts
- `breasts:enhanced` - Implants/enhanced
- `breasts:perky` - Perky/upright

### 6️⃣ DEMOGRAPHICS - AGE (5 tags)
*Age groups*

- `age:college` - College age (20-24)
- `age:adult` - Adult (25-30)
- `age:milf` - MILF age (30-45)
- `age:mature` - 40-49 years
- `age:gilf` - 50+ years

### 7️⃣ DEMOGRAPHICS - ETHNICITY (7 tags)
*Ethnic/racial categories*

- `ethnicity:asian` - Asian (all)
- `ethnicity:latina` - Latina/Hispanic
- `ethnicity:ebony` - Black/African
- `ethnicity:white` - White/Caucasian
- `ethnicity:indian` - Indian/South Asian
- `ethnicity:middle_eastern` - Middle Eastern/Arab
- `ethnicity:mixed` - Mixed race

### 8️⃣ STYLE/AESTHETIC (12 tags)
*Visual style and modifications*

- `style:alt` - Alternative style
- `style:goth` - Goth aesthetic
- `style:egirl` - E-girl aesthetic
- `style:tattooed` - Has tattoos
- `style:pierced` - Has piercings
- `style:natural` - Natural/no modifications
- `style:bimbo` - Bimbo aesthetic
- `style:tomboy` - Tomboy style
- `style:femdom` - Dominant aesthetic
- `style:submissive` - Submissive aesthetic
- `style:lingerie` - Lingerie focused
- `style:uniform` - Uniforms (school, nurse, etc.)

### 9️⃣ HAIR (4 tags)
*Distinctive hair colors only*

- `hair:blonde` - Blonde hair
- `hair:redhead` - Red/ginger hair
- `hair:brunette` - Brown hair
- `hair:colored` - Dyed/unnatural colors

### 🔟 SPECIAL ATTRIBUTES (8 tags)
*Specific attributes or themes*

- `special:hairy` - Hairy/bush
- `special:flexible` - Flexibility focus
- `special:tall` - Tall girls (5'10"+)
- `special:short` - Short girls (under 5'2")
- `special:breeding` - Breeding kink
- `special:slutty` - Slut themes
- `special:clothed` - Clothed/teasing
- `special:bent_over` - Bent over poses

### 1️⃣1️⃣ CONTENT TYPE (2 tags)
*Content creation style*

- `content:oc` - Original content only
- `content:professional` - Professional photography

## Tag Assignment Rules

### Tag Quantity Guidelines
- **PREFERRED: 1 tag when it sufficiently describes the subreddit**
- **MAXIMUM: 2 tags when absolutely necessary for precision**
- Use 1 tag when the subreddit has a single clear focus
- Use 2 tags only when both are essential to prevent mismatches
- Priority order: niche/focus → body/demographic → style

### Examples

#### r/AsianHotties
```json
["ethnicity:asian", "focus:full_body"]
```

#### r/paag
```json
["ethnicity:asian"]
```
*Note: Asian-specific, PAWG concept implied*

#### r/gothsluts
```json
["style:goth", "special:slutty"]
```

#### r/DadWouldBeProud
```json
["age:college"]
```
*Note: Young adult theme, not necessarily teen*

#### r/XMenCosplayers
```json
["niche:cosplay"]
```
*Note: Only gets cosplay tag, preventing inappropriate matches*

#### r/BigBoobsGW
```json
["focus:breasts", "breasts:large"]
```

#### r/fuckdoll
```json
["special:slutty", "niche:amateur"]
```

## Model-Subreddit Matching

Models are assigned tags from the same pool. A subreddit matches a model if they share at least 1 tag.

### Example Matching
Model tags: `["ethnicity:asian", "body:petite"]`
- ✅ Matches r/AsianHotties `["ethnicity:asian", "focus:full_body"]`
- ✅ Matches r/xsmallgirls `["body:petite", "special:slutty"]`
- ❌ Does NOT match r/XMenCosplayers `["niche:cosplay"]`

## Query Examples

### Find Asian subreddits
```sql
SELECT * FROM reddit_subreddits
WHERE tags @> '["ethnicity:asian"]'
```

### Find subreddits matching model
```sql
-- Model has tags ["body:petite", "style:goth"]
SELECT * FROM reddit_subreddits
WHERE tags && '["body:petite", "style:goth"]'::jsonb
```

## Migration Notes

All existing tags in the database will be cleared and recategorized using this new system:
- Platform tags (platform:*) → REMOVED
- Mood tags (theme:mood:*) → REMOVED
- Nudity tags (style:nudity:*) → REMOVED
- Detailed features → SIMPLIFIED

---

*Last Updated: January 2025*
*Total Tags: 82*
*Categories: 11*
*Tags per Subreddit: 1-2 (prefer 1)*