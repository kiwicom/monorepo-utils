// @flow strict

import os from 'os';

import ShellCommand from './ShellCommand';

function __parseRows(changes /*: string */) /*: $ReadOnlyArray<string> */ {
  return changes.split(os.EOL).filter(row => row !== '');
}

function git(...args /*: $ReadOnlyArray<string> */): string {
  // TODO: unify with Git implementation from Shipit (?)
  return new ShellCommand(null, 'git', '--no-pager', ...args)
    .setEnvironmentVariables(
      new Map([
        // https://git-scm.com/docs/git#_environment_variables
        ['GIT_CONFIG_NOSYSTEM', '1'],
        ['GIT_TERMINAL_PROMPT', '0'],
      ]),
    )
    .runSynchronously()
    .getStdout();
}

const BASE_BRANCH_NAME = 'origin/master';

const Git = {
  __parseRows,

  getHeadRevision(short /*: boolean */): string {
    const printShort = short ? '--short' : '';
    return git('rev-parse', printShort, 'HEAD').trim();
  },

  // git show-branch --topics -a origin/master HEAD | grep '\*' | grep '+' | grep -v 'HEAD' | head -n 1 | sed 's/.*\[\(.*\)\].*/\1/'
  getPreviousBranchName(): string {
    const rawBranch = git('show-branch', '--topics', '--all', BASE_BRANCH_NAME, 'HEAD');
    const rows = __parseRows(rawBranch);
    const filteredRows = rows.filter(
      (row: string): boolean => /\*/u.test(row) && /\+/u.test(row) && !/HEAD/u.test(row),
    );
    if (filteredRows.length <= 0) {
      return BASE_BRANCH_NAME;
    }
    const firstRow = filteredRows[0];
    // see https://github.com/babel/babel/issues/10367 and https://github.com/babel/babel/pull/10447
    const matches = firstRow.match(/.*\[(.*)\].*/u); // eslint-disable-line prefer-named-capture-group
    if (matches == null || matches.length < 2) {
      return BASE_BRANCH_NAME;
    }
    const branchName = matches[1].trim();

    return branchName != null && branchName !== '' ? branchName : BASE_BRANCH_NAME;
  },

  getUntrackedFiles() /*: $ReadOnlyArray<string> */ {
    const rawUntrackedChanges = git('ls-files', '--others', '--exclude-standard');
    return __parseRows(rawUntrackedChanges);
  },

  // Returns uncommitted (but staged) changes from Git worktree.
  getWorktreeChangedFiles() /*: $ReadOnlyArray<string> */ {
    const rawWorktreeChanges = git('diff', '--name-only', 'HEAD');
    return __parseRows(rawWorktreeChanges);
  },

  getWorktreeChanges() /*: string */ {
    const rawWorktreeChanges = git('diff', 'HEAD');
    return rawWorktreeChanges.trim();
  },

  getChangedFiles() /*: $ReadOnlyArray<string> */ {
    const previousBranchName = Git.getPreviousBranchName();
    const rawChanges = git('diff', '--name-only', `${previousBranchName}...HEAD`);
    return __parseRows(rawChanges);
  },

  getLastCommitChanges() /*: $ReadOnlyArray<string> */ {
    const rawChanges = git('diff', '--name-only', 'HEAD^', 'HEAD');
    return __parseRows(rawChanges);
  },

  getChangesToTest() /*: $ReadOnlyArray<string> */ {
    let changes = Git.getUntrackedFiles()
      .concat(Git.getWorktreeChangedFiles())
      .concat(Git.getChangedFiles());
    if (changes.length === 0) {
      changes = Git.getLastCommitChanges();
    }
    return changes;
  },
};

module.exports = Git;
