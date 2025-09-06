import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CategorizationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page-specific locators
  get pageTitle() {
    return this.page.locator('h1:has-text("Categorization"), h2:has-text("Categorization")');
  }

  get categorySelector() {
    return this.page.locator('[data-testid="category-selector"]');
  }

  get categoryInput() {
    return this.page.locator('input[placeholder*="category"], input[placeholder*="Category"]');
  }

  get categoryDropdown() {
    return this.page.locator('[data-testid="category-dropdown"]');
  }

  get categoryOptions() {
    return this.page.locator('[data-testid="category-option"]');
  }

  get successToast() {
    return this.page.locator('[data-testid="success-toast"], .toast-success, [role="alert"]:has-text("success"), .sonner-toast[data-type="success"]');
  }

  // Filter controls specific to categorization
  get okOnlyFilter() {
    return this.page.locator('button:has-text("Ok Only"), [data-testid="ok-filter"]');
  }

  get uncategorizedFilter() {
    return this.page.locator('button:has-text("Uncategorized"), [data-testid="uncategorized-filter"]');
  }

  // Table elements
  get categorizationTable() {
    return this.page.locator('table');
  }

  get categoryColumn() {
    return this.page.locator('td [data-testid="category-cell"]');
  }

  get categoryInputs() {
    return this.page.locator('td input[placeholder*="category"]');
  }

  // Bulk categorization
  get bulkCategoryInput() {
    return this.page.locator('[data-testid="bulk-category-input"]');
  }

  get bulkCategorizeButton() {
    return this.page.locator('button:has-text("Categorize Selected"), [data-testid="bulk-categorize"]');
  }

  // AI suggestions (if implemented)
  get aiSuggestionBadges() {
    return this.page.locator('[data-testid="ai-suggestion"]');
  }

  get acceptSuggestionButton() {
    return this.page.locator('[data-testid="accept-suggestion"]');
  }

  get rejectSuggestionButton() {
    return this.page.locator('[data-testid="reject-suggestion"]');
  }

  // Save/Apply buttons
  get saveButton() {
    return this.page.locator('button:has-text("Save"), [data-testid="save-categories"]');
  }

  get applyButton() {
    return this.page.locator('button:has-text("Apply"), [data-testid="apply-categories"]');
  }

  // Category management
  get newCategoryButton() {
    return this.page.locator('button:has-text("New Category"), [data-testid="new-category"]');
  }

  get categoryManagementModal() {
    return this.page.locator('[data-testid="category-modal"]');
  }

  // Methods for interacting with the page
  async navigateToPage() {
    await this.navigateToCategorization();
    await this.waitForPageLoad();
  }

  async filterByOkOnly() {
    await this.okOnlyFilter.click();
    await this.waitForDataLoad();
  }

  async filterByUncategorized() {
    await this.uncategorizedFilter.click();
    await this.waitForDataLoad();
  }

  async categorizeSubreddit(index: number, category: string) {
    const categoryInput = this.categoryInputs.nth(index);
    await categoryInput.fill(category);
    await categoryInput.press('Enter');
    
    // Wait for success notification or save
    await this.page.waitForTimeout(1000); // Brief wait for auto-save
  }

  async bulkCategorizeSelected(category: string) {
    await this.bulkCategoryInput.fill(category);
    await this.bulkCategorizeButton.click();
    
    // Wait for success toast
    await this.successToast.waitFor({ timeout: 10000 });
  }

  async selectCategoryFromDropdown(category: string) {
    await this.categoryDropdown.click();
    await this.categoryOptions.filter({ hasText: category }).click();
  }

  async createNewCategory(categoryName: string) {
    await this.newCategoryButton.click();
    await this.categoryManagementModal.waitFor();
    
    const newCategoryInput = this.categoryManagementModal.locator('input');
    await newCategoryInput.fill(categoryName);
    
    const confirmButton = this.categoryManagementModal.locator('button:has-text("Create"), button:has-text("Add")');
    await confirmButton.click();
    
    await this.categoryManagementModal.waitFor({ state: 'detached' });
  }

  async acceptAISuggestion(index: number) {
    await this.aiSuggestionBadges.nth(index).locator(this.acceptSuggestionButton).click();
    await this.successToast.waitFor({ timeout: 5000 });
  }

  async rejectAISuggestion(index: number) {
    await this.aiSuggestionBadges.nth(index).locator(this.rejectSuggestionButton).click();
  }

  async saveCategories() {
    await this.saveButton.click();
    await this.successToast.waitFor({ timeout: 10000 });
  }

  // Utility methods
  async getSubredditCategory(index: number) {
    const categoryCell = this.categoryColumn.nth(index);
    return await categoryCell.textContent();
  }

  async getCategorizedCount() {
    // Count rows that have categories assigned
    return await this.categoryColumn.locator(':not(:empty)').count();
  }

  async getUncategorizedCount() {
    // Count rows that don't have categories assigned
    return await this.categoryColumn.locator(':empty').count();
  }

  async getAvailableCategories() {
    await this.categoryDropdown.click();
    const categories = await this.categoryOptions.allTextContents();
    await this.categoryDropdown.click(); // Close dropdown
    return categories;
  }

  async searchByCategory(category: string) {
    await this.search(category);
    await this.waitForDataLoad();
  }

  // Verification methods
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.categorizationTable).toBeVisible();
  }

  async verifyCategoryApplied(index: number, expectedCategory: string) {
    const actualCategory = await this.getSubredditCategory(index);
    expect(actualCategory).toBe(expectedCategory);
  }

  async verifyBulkCategorizationSuccess(count: number) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(`${count}`);
    await expect(this.successToast).toContainText('categorized');
  }

  async verifyFilterApplied(filter: 'ok' | 'uncategorized') {
    // Verify that the appropriate filter button is active/selected
    if (filter === 'ok') {
      await expect(this.okOnlyFilter).toHaveClass(/active|selected/);
    } else {
      await expect(this.uncategorizedFilter).toHaveClass(/active|selected/);
    }
  }

  async verifyAISuggestion(index: number, expectedCategory: string) {
    const suggestionBadge = this.aiSuggestionBadges.nth(index);
    await expect(suggestionBadge).toBeVisible();
    await expect(suggestionBadge).toContainText(expectedCategory);
  }

  // Performance testing
  async measureCategorizationTime(index: number, category: string) {
    const startTime = Date.now();
    await this.categorizeSubreddit(index, category);
    return Date.now() - startTime;
  }

  async measureBulkCategorizationTime(category: string) {
    const startTime = Date.now();
    await this.bulkCategorizeSelected(category);
    return Date.now() - startTime;
  }

  // Keyboard shortcuts specific to categorization
  async useSaveShortcut() {
    await this.useKeyboardShortcut('Control+s');
  }

  async focusCategoryInput(index: number) {
    await this.categoryInputs.nth(index).click();
    await expect(this.categoryInputs.nth(index)).toBeFocused();
  }
}