// @flow

import path from 'path';

import ChildProcess from '../ChildProcess';

it('forwards exit code correctly', done => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

  const child = ChildProcess.fork(
    path.join(__dirname, 'ChildProcessFixtures/exit.js'),
  );

  child.on('exit', () => {
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
    done();
  });
});

it('exits gracefully on success', done => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

  const child = ChildProcess.fork(
    path.join(__dirname, 'ChildProcessFixtures/success.js'),
  );

  child.on('exit', () => {
    expect(mockExit).toHaveBeenCalledWith(0);
    mockExit.mockRestore();
    done();
  });
});
