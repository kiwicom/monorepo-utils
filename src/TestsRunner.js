// @flow

import execa from 'execa';
import { invariant } from '@mrtnzlml/utils';

import findPathsToTest from './findPathsToTest';
import { type WorkspaceDependencies } from './Workspaces.flow';

function _runJest(config, stdio = 'inherit', timezone = 'UTC') {
  process.env.TZ = timezone;
  console.warn(`Running tests in timezone: ${timezone}`); // eslint-disable-line no-console
  return execa.sync('jest', ['--config=jest.config.js', ...config], {
    stdio,
  });
}

function _runJestTimezoneVariants(config, ciNode: CINode) {
  if (ciNode.total > 1) {
    const index = ciNode.index - 1;
    const timezones = [
      'UTC',
      'Asia/Tokyo', // +9
      'America/Lima', // -5
    ];

    invariant(
      timezones[index] !== undefined,
      `CI node with index ${ciNode.index} is not supported.`,
    );

    _runJest(config, 'inherit', timezones[index]);
  } else {
    _runJest(config, 'inherit', 'UTC');
  }
}

type ExternalConfig = $ReadOnlyArray<string>;
type CINode = {|
  +index: number,
  +total: number,
|};

/**
 * This script tests the whole application except Yarn Workspaces. Workspaces
 * and its related workspaces are being tested only when something actually
 * changed there. Therefore if you don't touch workspaces then they should
 * be completely ignored in the tests.
 *
 * Please note, something like this is not sufficient at this moment because
 * it doesn't work with Yarn Workspaces:
 *
 * ```
 * yarn test --listTests --findRelatedTests src/packages/signed-source/src/SignedSource.js --json
 * ```
 *
 * Hopefully, this is going to be resolved and then we can completely remove
 * this script. See: https://github.com/facebook/jest/issues/6062
 */
export function runTests(externalConfig: ExternalConfig, ciNode: CINode) {
  const { stdout } = execa.sync('yarn', ['workspaces', 'info', '--json'], {
    stdio: 'pipe',
  });
  const workspaceDependencies: WorkspaceDependencies = JSON.parse(
    JSON.parse(stdout).data,
  );

  if (externalConfig.some(option => /^(?!--).+/.test(option))) {
    // user passed something that is not an option (probably tests regexp)
    // so we give it precedence before our algorithm
    _runJestTimezoneVariants(externalConfig, ciNode);
    return;
  }

  // TODO:
  //  This is probably not good enough because it lists only related tests.
  //  However, there may be changes in non-JS files affecting the tests results
  //  and Jest is not able to detect this for obvious reasons. It would be better
  //  to extract the implementation from Jest and use Git here directly. This
  //  way we can find all related files and not only related test files.
  const changedFilesOutput = _runJest(
    // https://jestjs.io/docs/en/cli.html#changedfileswithancestor
    ['--listTests', '--changedFilesWithAncestor', '--json'],
    'pipe',
  );

  const changedTestFiles = JSON.parse(changedFilesOutput.stdout);
  const pathsToTest = findPathsToTest(workspaceDependencies, changedTestFiles);

  if (pathsToTest.size > 0 || changedTestFiles.length > 0) {
    // we are running tests only when we have dirty workspaces OR when we
    // have some files to test outside of our workspaces (system level tests)
    const jestConfig = Array.from(pathsToTest).concat(changedTestFiles);
    _runJestTimezoneVariants(jestConfig.concat(externalConfig), ciNode);
  }
}

export function runAllTests(externalConfig: ExternalConfig, ciNode: CINode) {
  _runJestTimezoneVariants(
    externalConfig.length > 0 ? externalConfig : [],
    ciNode,
  );
}
