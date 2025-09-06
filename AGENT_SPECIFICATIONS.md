# Specialized Agent Specifications

This document defines the capabilities, responsibilities, and implementation requirements for each specialized agent in the Reddit analytics system development workflow.

## 🤖 Agent Hierarchy & Activation Schedule

### **Phase 1: Critical Infrastructure (ACTIVE NOW)**
1. **Scraper Monitoring Agent** - Fix broken scraper page (URGENT)
2. **Protection Agent** - Prevent breaking changes and crashes

### **Phase 2: User Experience (NEXT)**  
3. **Apple UI Agent** - Implement frosted glass design system
4. **Website Filter Agent** - Enhanced dashboard filtering

### **Phase 3: Intelligence & Automation (FUTURE)**
5. **Smart Filter Agent** - Subreddit pre-filtering system
6. **AI Categorization Agent** - Automated category suggestions

### **Phase 4: DevOps & Testing (FINAL)**
7. **GitHub/Vercel Deploy Agent** - CI/CD automation
8. **Playwright Testing Agent** - E2E testing framework

---

## 1. 🔧 Scraper Monitoring Agent

### **Primary Responsibility**
Fix the completely broken scraper status page and create comprehensive backend monitoring system.

### **Core Capabilities**
- **Real-time Status Display** - Live account health and activity metrics
- **Performance Analytics** - Discovery rates, success percentages, processing speeds
- **Error Detection** - Automatic issue identification and alerting
- **Log Integration** - Dashboard access to PythonAnywhere logs
- **Control Actions** - Manual trigger capabilities and account management

### **Technical Skills**
- Next.js API route development
- Supabase database integration
- Real-time data subscriptions
- Error handling and recovery
- Performance monitoring systems

### **Deliverables**
```
Week 1:
✅ Fix broken scraper page completely
✅ Add real-time account status display
✅ Implement performance metrics dashboard  
✅ Create log viewing interface
✅ Add manual control actions
```

### **Success Criteria**
- Scraper page loads without errors
- Real-time data updates every 30 seconds
- All 3 Reddit accounts visible with status
- Performance metrics updating correctly
- Manual refresh triggers working

---

## 2. 🛡️ Protection Agent

### **Primary Responsibility**  
Prevent accidental breaking changes and implement comprehensive error handling.

### **Core Capabilities**
- **File Protection System** - Mark critical files as protected with warnings
- **Error Boundary Implementation** - Prevent page crashes from component failures
- **Input Validation** - Form and API request validation
- **Fallback States** - Graceful degradation for failed operations
- **Development Safeguards** - Pre-commit hooks and validation

### **Technical Skills**
- TypeScript strict mode configuration
- React Error Boundary implementation
- Form validation with Zod/Yup
- Git hooks and automation
- Testing framework integration

### **Deliverables**
```
Week 1:
✅ Add error boundaries to all major components
✅ Implement file protection warnings
✅ Create input validation system
✅ Add fallback UI components
✅ Set up TypeScript strict mode
```

### **Success Criteria**
- Zero full-page crashes from unhandled errors
- Clear warnings before editing protected files
- All forms validate input properly
- Failed API calls show user-friendly messages
- TypeScript catches errors before deployment

---

## 3. 🎨 Apple UI Agent

### **Primary Responsibility**
Transform the dashboard into a polished Apple-style interface with frosted glass effects and smooth animations.

### **Core Capabilities**
- **Design System Creation** - Comprehensive Apple-style component library
- **Frosted Glass Implementation** - Backdrop-filter effects with fallbacks
- **Animation System** - Smooth transitions and micro-interactions
- **Brand Integration** - Pink (#FF8395) accent color integration
- **Typography & Spacing** - Apple-style font weights and spacious layouts

### **Technical Skills**
- Advanced CSS/Tailwind customization
- CSS animations and transitions
- Design system architecture
- Component library development
- Cross-browser compatibility

### **Deliverables**
```
Week 2:
✅ Create frosted glass component library
✅ Implement smooth animation system
✅ Apply Apple aesthetic to all pages
✅ Integrate pink brand color tastefully
✅ Update typography and spacing
```

### **Success Criteria**
- All cards use frosted glass backgrounds
- Smooth 60fps animations throughout
- Pink brand color enhances (doesn't overwhelm)
- Spacious, minimal layouts achieved
- Consistent Apple-style visual language

---

## 4. ⚙️ Website Filter Agent

### **Primary Responsibility**
Enhance dashboard filtering capabilities with advanced search, saved presets, and bulk operations.

### **Core Capabilities**
- **Advanced Search** - Multi-criteria search builder
- **Saved Presets** - Named filter configurations
- **Bulk Operations** - Multi-select and batch actions  
- **Export Functionality** - Filtered data export
- **Performance Optimization** - Fast filtering with large datasets

### **Technical Skills**
- Complex state management (React)
- Search algorithm optimization
- Local storage integration
- CSV/Excel export generation
- Database query optimization

### **Deliverables**
```
Week 3:
✅ Advanced search with multiple criteria
✅ Saved filter presets system
✅ Bulk selection and operations
✅ Export filtered results feature
✅ Performance optimization for large datasets
```

### **Success Criteria**
- Multi-criteria search works instantly
- Users can save and reuse filter presets
- Bulk operations handle 100+ items smoothly
- Export generates clean CSV/Excel files
- Filtering remains fast with 10k+ records

---

## 5. 🧠 Smart Filter Agent

### **Primary Responsibility**
Implement conservative keyword-based pre-filtering to reduce manual subreddit review workload by 60-70%.

### **Core Capabilities**
- **Keyword Analysis** - Conservative 2+ keyword requirement
- **Rule Scanning** - Detect seller restrictions in subreddit rules
- **Quality Scoring** - Pre-rank subreddit potential
- **Whitelist Management** - Protected high-value subreddits
- **Manual Override** - Allow bypass of filtering decisions

### **Technical Skills**
- Python text processing and NLP
- Regular expression patterns
- Classification algorithms
- Database integration
- Performance optimization

### **Deliverables**
```
Week 5-6:
✅ Conservative keyword filtering system
✅ Rule analysis for seller restrictions  
✅ Quality scoring algorithm
✅ Whitelist management interface
✅ Manual override capabilities
```

### **Success Criteria**
- 60-70% reduction in manual review time
- <5% false negatives (good subreddits filtered)
- >90% accuracy on obvious non-matches
- Manual override works instantly
- System learns from user corrections

---

## 6. 🤖 AI Categorization Agent

### **Primary Responsibility**
Develop AI-powered automatic categorization system for subreddits using existing approved data.

### **Core Capabilities**
- **Category Analysis** - Learn from 425 existing "Ok" subreddits
- **Classification Engine** - AI-powered category suggestions
- **Confidence Scoring** - Reliability metrics for suggestions
- **Bulk Processing** - Handle 1000+ subreddits efficiently
- **Learning System** - Improve from user corrections

### **Technical Skills**
- OpenAI API integration
- Machine learning classification
- Natural language processing
- Batch processing systems
- Cost optimization strategies

### **Deliverables**
```
Week 7-8:
✅ Analyze existing approved subreddits
✅ Generate master category list
✅ AI classification system
✅ Confidence scoring mechanism
✅ Bulk processing interface
```

### **Success Criteria**
- 80%+ accuracy in category suggestions
- Processing 1000 subreddits under $100
- Confidence scores correlate with accuracy
- Bulk operations complete in <10 minutes
- System improves from user feedback

---

## 7. 🚀 GitHub/Vercel Deploy Agent

### **Primary Responsibility**
Create automated CI/CD pipeline for safe, efficient deployments.

### **Core Capabilities**
- **GitHub Actions** - Automated testing and deployment
- **Vercel Integration** - Seamless production deployments
- **Environment Management** - Safe handling of secrets and configs
- **Rollback System** - Quick recovery from bad deployments
- **Branch Protection** - Prevent direct pushes to main

### **Technical Skills**
- GitHub Actions workflow development
- Vercel CLI and API integration
- Environment variable management
- Git branch management
- Deployment automation

### **Deliverables**
```
Week 9-10:
✅ GitHub Actions CI/CD pipeline
✅ Automated testing on pull requests
✅ Vercel deployment integration  
✅ Environment management system
✅ Rollback and recovery procedures
```

### **Success Criteria**
- All commits trigger automated testing
- Successful tests auto-deploy to Vercel
- Environment secrets handled securely
- Failed deployments rollback automatically
- Team can deploy safely without breaking

---

## 8. 🎭 Playwright Testing Agent

### **Primary Responsibility**
Implement comprehensive end-to-end testing to prevent regressions and ensure reliability.

### **Core Capabilities**
- **E2E Test Suite** - Complete user workflow testing
- **Visual Regression** - Screenshot comparison testing
- **Performance Testing** - Load time and interaction speed
- **Cross-browser Testing** - Chrome, Firefox, Safari support
- **Automated Reporting** - Test results and failure analysis

### **Technical Skills**
- Playwright test framework
- Test automation strategies
- Visual comparison tools
- Performance measurement
- CI/CD integration

### **Deliverables**
```
Week 11-12:
✅ Core workflow E2E tests
✅ Visual regression test suite
✅ Performance benchmarking
✅ Cross-browser compatibility tests
✅ Automated test reporting
```

### **Success Criteria**
- All critical user flows tested automatically
- Visual regressions caught before deployment
- Performance regressions detected early
- Tests run on every pull request
- Clear reporting of test results

---

## 🎯 Agent Activation Protocol

### **Phase 1: Immediate (Current Focus)**
```
ACTIVATE NOW:
✅ Scraper Monitoring Agent (URGENT - broken page)
✅ Protection Agent (prevent further breaking)

SUCCESS CRITERIA:
- Scraper page working completely
- Zero page crashes from errors
```

### **Phase 2: User Experience (Next Priority)**
```
ACTIVATE AFTER PHASE 1:
✅ Apple UI Agent (design transformation)
✅ Website Filter Agent (enhanced filtering)

SUCCESS CRITERIA:
- Apple aesthetic implemented
- Advanced filtering capabilities
```

### **Phase 3: Intelligence (Future Enhancement)**
```
ACTIVATE AFTER PHASE 2:
✅ Smart Filter Agent (reduce manual work)
✅ AI Categorization Agent (automation)

SUCCESS CRITERIA:
- 70% reduction in manual review time
- AI categorization working accurately
```

### **Phase 4: DevOps (Final Polish)**
```
ACTIVATE AFTER PHASE 3:
✅ GitHub/Vercel Deploy Agent (automation)
✅ Playwright Testing Agent (quality assurance)

SUCCESS CRITERIA:
- Automated deployments working
- Comprehensive test coverage
```

## 📊 Success Tracking

Each agent will report progress using standardized metrics:

### **Weekly Progress Report**
```
Agent: [Name]
Phase: [1-4] 
Status: [Active/Pending/Complete]
Progress: [0-100%]
Blockers: [Issues requiring resolution]
Next Actions: [Immediate priorities]
```

### **Completion Criteria**
- All deliverables completed and tested
- Success criteria met with measurable results
- User acceptance and feedback collected
- Documentation updated and comprehensive
- Handoff to next phase agents completed

This agent specification system ensures systematic, high-quality implementation of all dashboard improvements while maintaining clear accountability and progress tracking.