// @flow

const nodeChildProcess = require('child_process');

/*::

// See: https://github.com/facebook/flow/blob/af99a9e671351a83971ec880e6bfcdc96eeba2d7/lib/node.js#L275
// Intentionally limited:

type ValidStdio = 'pipe' | 'ignore' | 'inherit';

type cp$spawnSyncOpts = {|
  +stdio?: ValidStdio | Array<ValidStdio>, // should be `tuple` but Flow internally define it as an array
  +cwd?: string,
  +input?: string, // stdin (overwrites stdio[0])
|};

*/

/**
 * Method `executeSystemCommand` is great if you need to run command on your OS.
 * This function performs additional checks to make sure this command actually
 * exists on your system.
 *
 * @deprecated use `ShellCommand` directly
 */
function executeSystemCommand(
  command /*: string */,
  argsOrOptions /*: ?(string[] | cp$spawnSyncOpts) */,
  options /*: ?cp$spawnSyncOpts */,
) /*: string */ {
  // note: doesn't work on Windows
  // escape somehow (?):
  try {
    nodeChildProcess.execSync(`command -v ${command}`);
  } catch (error) {
    error.message = `Command '${command}' doesn't exist in your OS and therefore cannot be executed.`;
    throw error;
  }
  const { stdout, status } = Array.isArray(argsOrOptions)
    ? nodeChildProcess.spawnSync(command, argsOrOptions, {
        ...options,
      })
    : nodeChildProcess.spawnSync(command, {
        ...argsOrOptions,
        ...options,
      });
  process.exitCode = status;
  return stdout !== null
    ? stdout.toString() // stdout is available only when used without stdio:inherit (otherwise it's being streamed)
    : stdout;
}

/**
 * This is our opinionated wrapper around `child_process` module. It exposes
 * limited API to solve all common problems when calling `child_process` from
 * Node.js or `execa` so you don't have to reinvent the wheel every time.
 * Moreover, it has proper Flow types in contract to `execa`.
 */
module.exports = {
  executeSystemCommand,

  // Note: we do not allow `exec` here which spawns `shell` to run the command.
};
