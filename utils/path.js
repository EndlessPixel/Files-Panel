const os = require('os');
const path = require('path');

const isWindows = process.platform === 'win32';

// 危险目录列表
const dangerDirs = isWindows
  ? [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\Users',
    'C:\\'
  ]
  : [
    '/',
    '/root',
    '/etc',
    '/bin',
    '/sbin',
    '/usr',
    '/lib',
    '/lib64',
    '/var'
  ];

// 判断是否危险目录
function isDangerDir(p) {
  const full = path.resolve(p);
  return dangerDirs.some(d =>
    full.toLowerCase().startsWith(d.toLowerCase())
  );
}

// 面包屑生成
function getBreadcrumbs(currentPath) {
  const resolved = path.resolve(currentPath);
  const parts = resolved.split(path.sep).filter(p => p);
  const crumbs = [];
  let acc = isWindows ? '' : '/';

  if (isWindows) {
    const drive = parts[0] + '\\';
    crumbs.push({ name: drive, path: drive });
    parts.shift();
  }

  for (const part of parts) {
    acc = path.join(acc, part);
    crumbs.push({ name: part, path: acc });
  }

  return crumbs;
}

module.exports = {
  isDangerDir,
  getBreadcrumbs,
  isWindows
};