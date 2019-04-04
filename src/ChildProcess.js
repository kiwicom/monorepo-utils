// @flow

const nodeChildProcess = require('child_process');

/*::

// See: https://github.com/facebook/flow/blob/af99a9e671351a83971ec880e6bfcdc96eeba2d7/lib/node.js#L275
// Intentionally limited:

type cp$forkOpts = {| +execArgv: string[] |};
type cp$spawnSyncOpts = {| +stdio: 'inherit' |};

*/

const cwd = process.cwd();

/**
 * Method `executeNodeScript` is perfect when you need to fork current
 * Node.js process and run another Node.js script by filename.
 */
function executeNodeScript(
  modulePath /*: string */,
  argsOrOptions /*: ?(string[] | cp$forkOpts) */,
  options /*: ?cp$forkOpts */,
) /*: child_process$ChildProcess */ {
  const defaultOptions = { cwd, stdio: 'inherit' };
  const child = Array.isArray(argsOrOptions)
    ? nodeChildProcess.fork(modulePath, argsOrOptions, {
        ...defaultOptions,
        ...options,
      })
    : nodeChildProcess.fork(modulePath, {
        ...defaultOptions,
        ...argsOrOptions,
        ...options,
      });
  return bindChildProcess(child);
}

/**
 * Method `executeSystemCommand` is great if you need to run command on your OS.
 * This function performs additional checks to make sure this command actually
 * exists on your system.
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
  executeNodeScript,
  executeSystemCommand,

  // Note: we do not allow `exec` here which spawns `shell` to run the command.
};

function bindChildProcess(child /*: child_process$ChildProcess */) {
  child.on('exit', code => {
    // always exit the main process when child process dies
    process.exit(code);
  });
  return child;
}
