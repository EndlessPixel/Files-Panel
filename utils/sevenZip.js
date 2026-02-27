const { execSync } = require('child_process');
const path = require('path');

// 7z.exe路径
const SEVEN_ZIP_PATH = path.join(__dirname, '..', 'bin', '7z.exe');

/**
 * 压缩文件或目录
 * @param {string} source - 源文件或目录路径
 * @param {string} destination - 目标压缩文件路径
 * @returns {string} - 执行结果
 */
function compress(source, destination) {
  try {
    // 构建命令
    const command = `"${SEVEN_ZIP_PATH}" a "${destination}" "${source}" -r`;
    
    // 执行命令
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    throw new Error(`压缩失败: ${error.message}`);
  }
}

/**
 * 解压文件
 * @param {string} archive - 压缩文件路径
 * @param {string} target - 目标解压目录路径
 * @returns {string} - 执行结果
 */
function extract(archive, target) {
  try {
    // 构建命令
    const command = `"${SEVEN_ZIP_PATH}" x "${archive}" -o"${target}" -y`;
    
    // 执行命令
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    throw new Error(`解压失败: ${error.message}`);
  }
}

module.exports = {
  compress,
  extract
};