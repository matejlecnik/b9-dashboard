import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(...classNames: string[]): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveTextContent(text: string | RegExp): R
      toBeChecked(): R
      toBeDisabled(): R
      toHaveFocus(): R
      toHaveAccessibleName(name?: string | RegExp): R
    }
  }
}
