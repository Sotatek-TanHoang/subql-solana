// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
import fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';
import {ProjectManifestV0_0_1, ProjectManifestV0_2_0} from '@subql/common';
import {Template} from '@subql/templates';
import yaml from 'js-yaml';
import rimraf from 'rimraf';
import simpleGit from 'simple-git';
import {isProjectSpecV0_2_0, ProjectSpecBase} from '../types';

export async function createProjectFromTemplate(
  localPath: string,
  project: ProjectSpecBase,
  template: Template
): Promise<string> {
  const projectPath = path.join(localPath, project.name);
  console.log(template);
  try {
    simpleGit().clone(template.remote, ['-b', template.branch, '--single-branch', project.name]);
    await prepare(projectPath, project);
  } catch (e) {
    console.log(e);
  }
  return projectPath;
}

export async function createProjectFromGit(
  localPath: string,
  project: ProjectSpecBase,
  projectRemote: string
): Promise<string> {
  const projectPath = path.join(localPath, project.name);
  simpleGit().clone(projectRemote, ['--single-branch', project.name]);
  await prepare(projectPath, project);
  return projectPath;
}

async function prepare(projectPath: string, project: ProjectSpecBase) {
  try {
    await prepareManifest(projectPath, project);
  } catch (e) {
    throw new Error('Failed to prepare read or write manifest while preparing the project');
  }
  try {
    await preparePackage(projectPath, project);
  } catch (e) {
    throw new Error('Failed to prepare read or write package.json while preparing the project');
  }
  try {
    await promisify(rimraf)(`${projectPath}/.git`);
  } catch (e) {
    throw new Error('Failed to remove .git from template project');
  }
}
async function preparePackage(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write package.json
  const packageData = await fs.promises.readFile(`${projectPath}/package.json`);
  const currentPackage = JSON.parse(packageData.toString());
  currentPackage.name = project.name;
  currentPackage.version = project.version;
  currentPackage.description = project.description ?? currentPackage.description;
  currentPackage.author = project.author;
  currentPackage.license = project.license;
  const newPackage = JSON.stringify(currentPackage, null, 2);
  await fs.promises.writeFile(`${projectPath}/package.json`, newPackage, 'utf8');
}

async function prepareManifest(projectPath: string, project: ProjectSpecBase): Promise<void> {
  //load and write manifest(project.yaml)
  const yamlPath = path.join(`${projectPath}`, `project.yaml`);
  const manifest = await fs.promises.readFile(yamlPath, 'utf8');
  const data = yaml.load(manifest) as ProjectManifestV0_0_1 | ProjectManifestV0_2_0;
  data.description = project.description ?? data.description;
  data.repository = project.repository ?? '';

  data.network.endpoint = project.endpoint;

  if (isProjectSpecV0_2_0(project)) {
    (data as ProjectManifestV0_2_0).version = project.version;
    (data as ProjectManifestV0_2_0).name = project.name;
    data.network.genesisHash = project.genesisHash;
  }

  const newYaml = yaml.dump(data);
  await fs.promises.writeFile(yamlPath, newYaml, 'utf8');
}

export function installDependencies(projectPath: string, useNpm?: boolean): void {
  let command = 'yarn install';

  if (useNpm || !checkYarnExists()) {
    command = 'npm install';
  }

  childProcess.execSync(command, {cwd: projectPath});
}

function checkYarnExists(): boolean {
  try {
    childProcess.execSync('yarn --version');
    return true;
  } catch (e) {
    return false;
  }
}
