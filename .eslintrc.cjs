const rules = {
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    jsx: true,
    project: 'tsconfig.json',
  },
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  rules: {
    'no-debugger': 'off',
    'no-console': 1,
    // note you must disable the base rule as it can report incorrect errors
    'lines-between-class-members': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
};

module.exports = rules;
