import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
});

function makeWarnings(configs) {
    const newconfigs = [];

    if (!Array.isArray(configs)) {
        configs = [configs];
    }

    for (const config of configs) {
        const newrules = {};
        for (const [rule, value] of Object.entries(config?.rules ?? {})) {
            if (Array.isArray(value) && value[0] === 'error') {
                newrules[rule] = ['warn', ...value.slice(1)];
            } else if (value === 'error') {
                newrules[rule] = 'warn';
            } else {
                newrules[rule] = value;
            }
        }

        newconfigs.push({
            ...config,
            rules: newrules,
        });
    }

    return newconfigs;
}

const config = [
    ...tseslint.config(
        ...compat.config({
            extends: ['next', 'next/core-web-vitals'],
        }),
        eslint.configs.recommended,
        tseslint.configs.strictTypeChecked,
        makeWarnings(tseslint.configs.stylisticTypeChecked),
        makeWarnings(stylistic.configs.customize({
            arrowParens: false,
            blockSpacing: true,
            commaDangle: 'always-multiline',
            indent: 4,
            jsx: true,
            quotes: 'single',
            quoteProps: 'consistent',
            semi: true,
        })),
        {
            languageOptions: {
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: import.meta.dirname,
                },
            },
            rules: {
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-argument': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-unnecessary-type-assertion': 'off',
                '@typescript-eslint/restrict-template-expressions': 'off',
                '@typescript-eslint/no-misused-spread': 'off',
                '@typescript-eslint/no-deprecated': 'warn',
                '@typescript-eslint/no-confusing-void-expression': 'off',
                '@typescript-eslint/no-unused-vars': ['warn', {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    vars: 'all',
                    varsIgnorePattern: '^_',
                }],

                '@stylistic/jsx-quotes': ['warn', 'prefer-single'],
                '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
            },
        },
    ),

    // ...warnings,
    // ...nextconfig,
    // {
    //     ignores: ['types/*', 'node_modules/*', '**/*.js'],
    //     languageOptions: {
    //     parserOptions: {
    //         projectService: true,
    //         tsconfigRootDir: import.meta.dirname,
    //     },
    //     globals: {
    //         ...globals.node,
    //         ...globals.browser
    //     },
    //     },
    //     rules: {
    //     // disable eslint rules that are already covered by tseslint
    //     'no-unused-vars': 'off',
    //     'no-unused-expressions': 'off',
    //     'no-useless-constructor': 'off',
    //     'no-empty-function': 'off',
    //     'require-await': 'off',

    //     '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
    //     '@typescript-eslint/await-thenable': 'error',
    //     '@typescript-eslint/class-methods-use-this': 'warn',
    //     '@typescript-eslint/consistent-type-exports': 'warn',
    //     '@typescript-eslint/consistent-type-imports': 'warn',
    //     '@typescript-eslint/default-param-last': 'error',
    //     '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
    //     '@typescript-eslint/init-declarations': 'error',
    //     '@typescript-eslint/naming-convention': ['warn', {
    //         selector: 'variableLike',
    //         format: ['camelCase'],
    //         leadingUnderscore: 'allow',
    //         trailingUnderscore: 'forbid',
    //     }, {
    //         selector: 'typeLike',
    //         format: ['PascalCase'],
    //         leadingUnderscore: 'forbid',
    //         trailingUnderscore: 'forbid',
    //     }, {
    //         selector: 'import',
    //         format: ['PascalCase', 'UPPER_CASE', 'camelCase'],
    //         leadingUnderscore: 'forbid',
    //         trailingUnderscore: 'forbid',
    //     }, {
    //         selector: 'function',
    //         format: ['camelCase', 'PascalCase'],
    //         leadingUnderscore: 'allow',
    //         trailingUnderscore: 'forbid',
    //     }, {
    //         selector: 'variable',
    //         format: ['PascalCase', 'camelCase'],
    //         leadingUnderscore: 'allow',
    //         trailingUnderscore: 'forbid',
    //         types: ['function']
    //     },{
    //         selector: 'variable',
    //         format: ['UPPER_CASE', 'camelCase', 'PascalCase'],
    //         leadingUnderscore: 'allow',
    //         trailingUnderscore: 'forbid',
    //         modifiers: ['const']
    //     }],
    //     '@typescript-eslint/no-duplicate-enum-values': 'error',
    //     '@typescript-eslint/no-duplicate-type-constituents': 'error',
    //     '@typescript-eslint/no-empty-function': 'off',
    //     '@typescript-eslint/no-explicit-any': 'off', // why are ts ppl so afraid of any?
    //     '@typescript-eslint/no-implied-eval': 'error',
    //     '@typescript-eslint/no-import-type-side-effects': 'error',
    //     '@typescript-eslint/no-non-null-assertion': 'off',
    //     '@typescript-eslint/no-redundant-type-constituents': 'off',
    //     '@typescript-eslint/no-require-imports': 'error',
    //     '@typescript-eslint/no-unnecessary-parameter-property-assignment': 'error',
    //     '@typescript-eslint/no-unnecessary-qualifier': 'warn',
    //     '@typescript-eslint/no-unnecessary-type-arguments': 'error',
    //     '@typescript-eslint/no-unnecessary-type-constraint': 'error',
    //     '@typescript-eslint/no-unsafe-argument': 'off',
    //     '@typescript-eslint/no-unsafe-assignment': 'off',
    //     '@typescript-eslint/no-unsafe-call': 'off',
    //     '@typescript-eslint/no-unsafe-declaration-merging': 'error',
    //     '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    //     '@typescript-eslint/no-unsafe-function-type': 'error',
    //     '@typescript-eslint/no-unsafe-member-access': 'off',
    //     '@typescript-eslint/no-unsafe-return': 'off',
    //     '@typescript-eslint/no-unsafe-unary-minus': 'error',
    //     '@typescript-eslint/no-unused-expressions': 'off',
    //     '@typescript-eslint/no-unused-vars': ['warn', {
    //         args: 'all',
    //         argsIgnorePattern: '^_',
    //         caughtErrors: 'all',
    //         caughtErrorsIgnorePattern: '^_',
    //         vars: 'all',
    //         varsIgnorePattern: '^_',
    //     }],
    //     '@typescript-eslint/no-use-before-define': 'error',
    //     '@typescript-eslint/no-useless-empty-export': 'error',
    //     '@typescript-eslint/no-misused-promises': 'off',
    //     '@typescript-eslint/no-confusing-void-expression': 'off',
    //     '@typescript-eslint/prefer-destructuring': ['warn', {
    //      VariableDeclarator: {
    //         array: true,
    //         object: true,
    //         },
    //         AssignmentExpression: {
    //         array: false,
    //         object: false,
    //         },
    //     }],
    //     '@typescript-eslint/promise-function-async': 'off',
    //     '@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: true }],
    //     '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
    //     '@typescript-eslint/return-await': ['error', 'in-try-catch'],
    //     '@typescript-eslint/switch-exhaustiveness-check': 'error',
    //     '@typescript-eslint/unbound-method': 'off',
    //     '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
    //     '@typescript-eslint/no-unnecessary-type-assertion': 'off',

    //     '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
    //     '@stylistic/no-tabs': 'off',
    //     '@stylistic/indent': ['warn', 'tab', { flatTernaryExpressions: true }],
    //     '@stylistic/jsx-quotes': ['warn', 'prefer-single'],
    //     }
    // }
];

export default config;
