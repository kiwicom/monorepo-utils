// @flow strict

import findPathsToTest from '../findPathsToTest';
import workspaceDependencies from './workspaceDependencies';

it('finds dirty paths to test based on the changed files', () => {
  const warnings = [];
  const spy = jest.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args));

  expect(
    findPathsToTest(workspaceDependencies, [
      '/unknown_path', // doesn't exist and therefore is not being reflected in the output
      '/src/packages/graphql-utils/src/index.js', // should run `@kiwicom/graphql-environment` and all the related packages (see findRelatedWorkspaces.test.js)
    ]),
  ).toMatchInlineSnapshot(`
    Set {
      "src/packages/graphql-utils/",
      "src/apps/graphql/",
    }
  `);

  expect(warnings).toMatchInlineSnapshot(`
    Array [
      Array [
        "DIRTY WORKSPACES:",
        Set {
          "@kiwicom/graphql-utils",
        },
      ],
      Array [
        "TESTING WORKSPACES:",
        Set {
          "@kiwicom/graphql-utils",
          "@kiwicom/graphql",
        },
      ],
    ]
  `);
  spy.mockRestore();
});
