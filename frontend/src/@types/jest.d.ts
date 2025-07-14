/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
      toHaveFocus(): R;
      toBeChecked(): R;
      toBeVisible(): R;
      toHaveValue(value?: string | number | readonly string[]): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toBeRequired(): R;
      toBeInvalid(): R;
      toHaveDescription(text?: string | RegExp): R;
      toHaveAccessibleName(name?: string | RegExp): R;
      toHaveAccessibleDescription(description?: string | RegExp): R;
    }
  }

  // Jest globals
  declare const describe: jest.Describe;
  declare const it: jest.It;
  declare const test: jest.It;
  declare const expect: jest.Expect;
  declare const beforeEach: jest.Lifecycle;
  declare const afterEach: jest.Lifecycle;
  declare const beforeAll: jest.Lifecycle;
  declare const afterAll: jest.Lifecycle;
}

// Make this a module
export {}; 