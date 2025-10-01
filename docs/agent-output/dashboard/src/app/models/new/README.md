# Create New Model Page

┌─ MODULE STATUS ─────────────────────────────────────────┐
│ ● ACTIVE    │ █████████████░░░░░░░ 65% COMPLETE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "current": "dashboard/src/app/models/new/README.md",
  "parent": "dashboard/src/app/models/new/README.md"
}
```

## Overview

Model onboarding and registration page for adding new OnlyFans creators to B9 Agency's management portfolio. This page provides a streamlined workflow for registering new talent and setting up their profiles in the system.

**Purpose**: Efficiently onboard new OnlyFans models with all necessary information for marketing and management.

## Features

### Current Implementation ✅
- **Basic Form**: Model registration form
- **Field Validation**: Basic input validation
- **Submit Functionality**: Create new model record

### Planned Features 🟡
- **Multi-step Wizard**: Guided onboarding process
- **Document Upload**: Contracts and ID verification
- **Automated Verification**: Social media account verification
- **Welcome Email**: Automated onboarding communications

## TODO List

### Priority 1: Form Enhancement
- [ ] Implement multi-step form wizard
- [ ] Add profile image upload with preview
- [ ] Create social media verification
- [ ] Add contract upload section

### Priority 2: Validation
- [ ] Verify OnlyFans username exists
- [ ] Check for duplicate models
- [ ] Validate social media links
- [ ] Add email verification

### Priority 3: Automation
- [ ] Auto-fetch OnlyFans stats
- [ ] Pull Instagram follower count
- [ ] Generate suggested commission rate
- [ ] Create welcome package

### Priority 4: Integration
- [ ] Connect to email service
- [ ] Set up Slack notifications
- [ ] Create calendar events
- [ ] Generate initial reports

## Current Errors

### Known Issues 🐛
1. **Form Submission**: Occasional timeout on submit
   - **Status**: Investigating server response
   - **Fix**: Adding loading states and timeout handling

2. **Image Upload**: Large images cause errors
   - **Status**: Implementing image compression
   - **Fix**: Adding client-side image optimization

3. **Validation Messages**: Unclear error messages
   - **Status**: Rewriting validation text
   - **Fix**: Creating user-friendly error messages

## Potential Improvements

### Onboarding Features
1. **AI Verification**: Automated identity verification
2. **Background Check**: Integrated screening service
3. **Niche Suggestion**: AI-powered category recommendations
4. **Revenue Projection**: Estimated earnings calculator
5. **Competitor Analysis**: Similar model comparison

### Technical Enhancements
1. **Progressive Form**: Save draft functionality
2. **Bulk Import**: CSV upload for multiple models
3. **Template System**: Pre-filled form templates
4. **API Integration**: Direct OnlyFans API verification

## Form Structure

### Step 1: Basic Information
```typescript
interface BasicInfo {
  stage_name: string       // Required, unique
  real_name: string        // Required, private
  email: string           // Required, verified
  phone: string           // Optional
  date_of_birth: Date     // Required, 18+ verification
  location: string        // City, Country
}
```

### Step 2: OnlyFans Details
```typescript
interface OnlyFansInfo {
  username: string         // Required, verified
  profile_url: string      // Auto-generated
  subscription_price: number
  current_subscribers: number
  account_age: number      // Months active
  content_type: string[]   // Content categories
}
```

### Step 3: Social Media
```typescript
interface SocialMedia {
  instagram?: {
    username: string
    followers: number
    verified: boolean
  }
  twitter?: {
    username: string
    followers: number
  }
  tiktok?: {
    username: string
    followers: number
  }
  reddit?: {
    username: string
    karma: number
  }
}
```

### Step 4: Contract Details
```typescript
interface ContractInfo {
  commission_rate: number   // Percentage
  contract_duration: number // Months
  payment_method: string
  bank_details: object     // Encrypted
  emergency_contact: object
  notes: string
}
```

## Validation Rules

### Required Fields
- Stage name (unique in database)
- Real name (legal name)
- Email (valid and unique)
- Date of birth (18+ only)
- OnlyFans username
- Commission rate

### Validation Logic
1. Check age is 18+
2. Verify email format
3. Validate OnlyFans URL
4. Check for existing model
5. Verify social media links
6. Validate commission range (0-50%)

## API Endpoints

- `POST /api/models` - Create new model
- `GET /api/models/check-username` - Check if username exists
- `POST /api/models/verify-socials` - Verify social accounts
- `POST /api/models/upload-document` - Upload contracts/ID
- `GET /api/models/suggested-commission` - Get recommended rate

## UI Components

### Form Components
- `StepWizard` - Multi-step form navigation
- `ModelForm` - Main form container
- `ImageUploader` - Profile picture upload
- `SocialVerifier` - Social media verification

### Validation Components
- `FieldValidator` - Real-time validation
- `ErrorMessage` - Validation error display
- `SuccessIndicator` - Valid field indicator
- `ProgressBar` - Form completion progress

## Submission Flow

```
1. User fills form
   ↓
2. Client-side validation
   ↓
3. Server-side validation
   ↓
4. Create model record
   ↓
5. Send notifications
   ↓
6. Redirect to model page
```

## Success Actions

### On Successful Creation
1. Create model record in database
2. Send welcome email to model
3. Notify management team
4. Create Slack channel
5. Schedule onboarding call
6. Generate initial reports
7. Redirect to model profile

## Security Considerations

### Data Protection
- SSL/TLS for all transmissions
- PII encrypted at rest
- Secure document storage
- Access logging
- GDPR compliance

### Verification
- Email verification required
- ID verification for age
- Social media ownership verification
- Contract signing audit trail

## Related Documentation

- **Models Dashboard**: `/src/app/models/README.md`
- **Model Detail Page**: `/src/app/models/[id]/README.md`
- **API Documentation**: `/src/app/api/models/README.md`

---

*New Model Creation - Streamlined onboarding for B9 Agency's growing talent portfolio*

---

_Version: 1.0.0 | Updated: 2025-10-01_