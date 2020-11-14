// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import exec = require('@actions/exec');
import io = require('@actions/io');
import fs = require('fs');
import os = require('os');
import path = require('path');

import * as updater from '../src/update-dotnet-sdk';

const tempDir = path.join(os.tmpdir(), 'update-dotnet-sdk-temp');
const globalJsonPath = path.join(tempDir, 'global.json');

describe('update-dotnet-sdk tests', () => {

  const inputs = {
    'INPUT_channel': "3.1",
    'INPUT_global-json-file': globalJsonPath,
    'INPUT_repo-token': "my-token",
    'INPUT_user-email': "github-actions[bot]@users.noreply.github.com",
    'INPUT_user-name': "github-actions[bot]"
  };

  beforeEach(async () => {
    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
    process.stdout.write = jest.fn();
    await io.rmRF(tempDir);
  })

  afterEach(async () => {
    try {
      await io.rmRF(path.join(tempDir, 'global.json'));
      await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 5000);

  it('Updates the .NET SDK in global.json if a new version is available', async () => {

    const sdkVersion = "3.1.201";
    const jsonContents = `{${os.EOL}"sdk": {${os.EOL}"version": "${sdkVersion}"${os.EOL}}${os.EOL}}`;

    await createTestGitRepo(globalJsonPath, jsonContents);

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs]
    }

    await updater.run();

    assertWriteCalled(`::set-output name=sdk-updated::true${os.EOL}`);

    const globalJson = JSON.parse(
      fs.readFileSync(globalJsonPath, { encoding: 'utf8' })
    );

    const actualVersion: string = globalJson.sdk.version;

    expect(actualVersion).not.toBe(sdkVersion);
  }, 1500000);
});

function assertWriteCalled(message: string): void {
  expect(process.stdout.write).toHaveBeenCalledWith(message);
}

async function createTestGitRepo(path: string, data: string): Promise<void> {

  if (!fs.existsSync(tempDir)) {
    io.mkdirP(tempDir);
  }

  fs.appendFileSync(path, data);
  fs.writeFileSync(path, data);

  const options = {
    cwd: tempDir,
    ignoreReturnCode: true
  };

  await exec.exec("git", [ "init" ], options);
  await exec.exec("git", [ "add", "." ], options);
  await exec.exec("git", [ "commit", "-m", "Initial commit" ], options);
}
