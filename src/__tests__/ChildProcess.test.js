// @flow

import nodeChildProcess from 'child_process';

import ChildProcess from '../ChildProcess';

describe('executeSystemCommand', () => {
  it('throws an exception when system command does not exist', () => {
    const processSpy = jest
      .spyOn(nodeChildProcess, 'execSync')
      .mockImplementation(() => {
        throw new Error('boom');
      });

    expect(() => ChildProcess.executeSystemCommand('mocked')).toThrowError(
      "Command 'mocked' doesn't exist in your OS and therefore cannot be executed.",
    );
    expect(processSpy).toHaveBeenCalledWith('command -v mocked');
  });

  it('sets error exit process code correctly', () => {
    const execSyncSpy = jest
      .spyOn(nodeChildProcess, 'execSync')
      .mockImplementation(() => {});
    const spawnSyncSpy = jest
      .spyOn(nodeChildProcess, 'spawnSync')
      .mockImplementation(() => ({
        stdout: 'ERROR',
        status: 1,
      }));

    ChildProcess.executeSystemCommand('mocked');

    expect(execSyncSpy).toHaveBeenCalledWith('command -v mocked');
    expect(spawnSyncSpy).toHaveBeenCalledWith('mocked', {});
    expect(process.exitCode).toBe(1);
  });

  it('sets success exit process code correctly', () => {
    jest.spyOn(nodeChildProcess, 'execSync').mockImplementation(() => {});
    const spawnSyncSpy = jest
      .spyOn(nodeChildProcess, 'spawnSync')
      .mockImplementation(() => ({
        stdout: 'SUCCESS',
        status: 0,
      }));

    ChildProcess.executeSystemCommand('mocked');

    expect(spawnSyncSpy).toHaveBeenCalledWith('mocked', {});
    expect(process.exitCode).toBe(0);
  });
});
