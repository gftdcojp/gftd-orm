#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * CalVer (Calendar Versioning) 形式のバージョン管理
 * 形式: YY.MM.MICRO (例: 25.01.0)
 * - YY: 年の下2桁
 * - MM: 月 (01-12)
 * - MICRO: その月の中でのリリース回数 (0から開始)
 */
class CalVerManager {
  constructor() {
    this.packageJsonPath = path.join(process.cwd(), 'package.json');
    this.lockFilePath = path.join(process.cwd(), '.calver-lock.json');
  }

  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return { year, month };
  }

  readPackageJson() {
    return JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
  }

  writePackageJson(packageJson) {
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }

  readLockFile() {
    if (fs.existsSync(this.lockFilePath)) {
      return JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
    }
    return {};
  }

  writeLockFile(data) {
    fs.writeFileSync(this.lockFilePath, JSON.stringify(data, null, 2) + '\n');
  }

  generateNextVersion(releaseType = 'patch') {
    const { year, month } = this.getCurrentDate();
    const lockData = this.readLockFile();
    const currentYearMonth = `${year}.${month}`;
    
    let micro = 0;
    
    if (lockData[currentYearMonth]) {
      micro = lockData[currentYearMonth] + 1;
    }
    
    // major releaseの場合はmicroを大きく飛ばす
    if (releaseType === 'major') {
      micro = Math.max(micro, 10);
    }
    
    // ロックファイルを更新
    lockData[currentYearMonth] = micro;
    this.writeLockFile(lockData);
    
    return `${year}.${month}.${micro}`;
  }

  updateVersion(releaseType = 'patch') {
    const packageJson = this.readPackageJson();
    const oldVersion = packageJson.version;
    const newVersion = this.generateNextVersion(releaseType);
    
    packageJson.version = newVersion;
    this.writePackageJson(packageJson);
    
    console.log(`📅 CalVer updated: ${oldVersion} → ${newVersion}`);
    console.log(`📦 Package: ${packageJson.name}`);
    console.log(`🗓️  Release type: ${releaseType}`);
    
    return newVersion;
  }

  getCurrentVersion() {
    const packageJson = this.readPackageJson();
    return packageJson.version;
  }

  showNextVersion(releaseType = 'patch') {
    const nextVersion = this.generateNextVersion(releaseType);
    console.log(`Next ${releaseType} version: ${nextVersion}`);
    return nextVersion;
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'patch';
  const manager = new CalVerManager();
  
  try {
    switch (command) {
      case 'patch':
      case 'minor':
      case 'major':
        manager.updateVersion(command);
        break;
      case 'show':
        console.log(`Current version: ${manager.getCurrentVersion()}`);
        break;
      case 'next':
        const type = args[1] || 'patch';
        manager.showNextVersion(type);
        break;
      default:
        console.log('Usage: node update-version.js [patch|minor|major|show|next]');
        console.log('  patch: Increment micro version for bug fixes');
        console.log('  minor: Increment micro version for new features');
        console.log('  major: Increment micro version significantly for breaking changes');
        console.log('  show:  Show current version');
        console.log('  next:  Show next version without updating');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = CalVerManager; 