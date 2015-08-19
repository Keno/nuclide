'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

var RemoteUri = require('nuclide-remote-uri');
var {
  Directory: LocalDirectory,
  File: LocalFile,
} = require('atom');
var {
  RemoteConnection,
  RemoteDirectory,
  RemoteFile,
} = require('nuclide-remote-connection');

type Directory = LocalDirectory | RemoteDirectory;
type File = LocalFile | RemoteFile;

function dirPathToKey(path: string): string {
  return path.replace(/\/+$/, '') + '/';
}

function isDirKey(key: string): boolean {
  return (key.slice(-1) === '/');
}

function keyToName(key: string): string {
  var path = keyToPath(key);
  var index = path.lastIndexOf('/');
  return (index === -1) ? path : path.slice(index + 1);
}

function keyToPath(key: string): string {
  return key.replace(/\/+$/, '');
}

// The array this resolves to contains the `nodeKey` of each child
function fetchChildren(nodeKey: string): Promise<Array<string>> {
  var directory = getDirectoryByKey(nodeKey);
  if (!directory) {
    // TODO: reject?
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    directory.getEntries((error, entries) => {
      // Resolve to an empty array if the directory deson't exist.
      if (error && error.code !== 'ENOENT') {
        reject(error);
        return;
      }
      entries = entries || [];
      var keys = entries.map(entry => {
        var path = entry.getPath();
        return entry.isDirectory() ? dirPathToKey(path) : path;
      });
      resolve(keys);
    });
  });
}

// TODO: cache these instantiated directories (also expose a way to purge)
function getDirectoryByKey(key: string): ?Directory {
  var path = keyToPath(key);
  if (RemoteUri.isRemote(path)) {
    var connection = RemoteConnection.getForUri(path);
    if (!connection) {
      return;
    }
    return new RemoteDirectory(connection, path);
  } else {
    return new LocalDirectory(path);
  }
}

// Sometimes remote directories are instantiated as local directories but with invalid paths.
function isValidDirectory(directory: Directory): boolean {
  return (!isLocalFile(directory) || isFullyQualifiedLocalPath(directory.getPath()));
}


// Private Helpers

function isLocalFile(entry: File | Directory): boolean {
  // TODO: implement `RemoteDirectory.isRemoteDirectory()`
  return !('getLocalPath' in entry);
}

function isFullyQualifiedLocalPath(path: string): boolean {
  return path.charAt(0) === '/';
}

module.exports = {
  dirPathToKey,
  isDirKey,
  keyToName,
  keyToPath,
  fetchChildren,
  getDirectoryByKey,
  isValidDirectory,
};