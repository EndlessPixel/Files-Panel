const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const os = require('os'); // 已引入os模块
const { isDangerDir, getBreadcrumbs } = require('../utils/path');
const { compress, extract } = require('../utils/sevenZip');

// 全局剪贴板
const clipboard = {
  type: null, // copy / cut
  source: null
};

// 上传配置
const upload = multer({ dest: os.tmpdir() });

// 获取目录列表
router.post('/list', async (req, res) => {
  try {
    const dir = req.body.path || process.cwd();
    const showHidden = req.body.showHidden || false;
    const danger = isDangerDir(dir);
    const list = await fs.readdir(dir, { withFileTypes: true });
    const crumbs = getBreadcrumbs(dir);

    // 过滤隐藏文件（如果需要）
    const filteredList = showHidden ? list : list.filter(item => !item.name.startsWith('.'));

    const items = await Promise.all(filteredList.map(async item => {
      const itemPath = path.join(dir, item.name);
      const stats = await fs.stat(itemPath);
      return {
        name: item.name,
        isDir: item.isDirectory(),
        path: itemPath,
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime
      };
    }));

    res.json({
      success: true,
      current: dir,
      danger,
      crumbs,
      items
    });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 新建文件（修改：接收dir+name，后端拼接路径）
router.post('/create-file', async (req, res) => {
  try {
    const { dir, name } = req.body;
    const p = path.join(dir, name); // 后端统一拼接路径
    if (isDangerDir(path.dirname(p))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await fs.ensureFile(p);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 新建文件夹（修改：接收dir+name，后端拼接路径）
router.post('/create-dir', async (req, res) => {
  try {
    const { dir, name } = req.body;
    const p = path.join(dir, name); // 后端统一拼接路径
    if (isDangerDir(path.dirname(p))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await fs.ensureDir(p);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 删除
router.post('/delete', async (req, res) => {
  try {
    const { path: p } = req.body;
    if (isDangerDir(p) || isDangerDir(path.dirname(p))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await fs.remove(p);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 重命名（修改：接收oldPath + newName，后端拼接新路径）
router.post('/rename', async (req, res) => {
  try {
    const { oldPath, newName } = req.body;
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName); // 后端统一拼接新路径
    if (isDangerDir(dir) || isDangerDir(path.dirname(newPath))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await fs.rename(oldPath, newPath);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 复制
router.post('/copy', (req, res) => {
  const { path: p } = req.body;
  clipboard.type = 'copy';
  clipboard.source = p;
  res.json({ success: true });
});

// 剪切
router.post('/cut', (req, res) => {
  const { path: p } = req.body;
  clipboard.type = 'cut';
  clipboard.source = p;
  res.json({ success: true });
});

// 粘贴
router.post('/paste', async (req, res) => {
  try {
    const { target } = req.body;
    if (!clipboard.source) return res.json({ success: false, msg: '剪贴板为空' });
    if (isDangerDir(target) || isDangerDir(path.dirname(clipboard.source))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }

    const name = path.basename(clipboard.source);
    const dest = path.join(target, name); // 后端统一拼接路径

    if (clipboard.type === 'copy') {
      await fs.copy(clipboard.source, dest);
    } else if (clipboard.type === 'cut') {
      await fs.move(clipboard.source, dest);
      clipboard.source = null;
    }

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 读取文件（文本 + 16进制）
router.post('/read', async (req, res) => {
  try {
    const { path: p } = req.body;
    const content = await fs.readFile(p, 'utf8');
    const hex = await fs.readFile(p);
    const hexStr = hex.toString('hex');
    res.json({ success: true, content, hex: hexStr });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 保存文件
router.post('/save', async (req, res) => {
  try {
    const { path: p, content } = req.body;
    if (isDangerDir(path.dirname(p))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await fs.writeFile(p, content, 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 上传
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { target } = req.body;
    if (isDangerDir(target)) return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    const dest = path.join(target, req.file.originalname); // 后端统一拼接路径
    await fs.move(req.file.path, dest, { overwrite: true });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 下载
router.get('/download', async (req, res) => {
  try {
    const p = decodeURIComponent(req.query.path); // 解码路径
    if (isDangerDir(path.dirname(p))) {
      return res.send('危险目录禁止下载');
    }
    res.download(p);
  } catch (e) {
    res.send('下载失败：' + e.message);
  }
});

// 压缩
router.post('/compress', async (req, res) => {
  try {
    const { source, name } = req.body;
    const dir = path.dirname(source);
    const output = path.join(dir, name); // 后端统一拼接压缩包路径
    if (isDangerDir(dir) || isDangerDir(path.dirname(output))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await compress(source, output);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 解压
router.post('/extract', async (req, res) => {
  try {
    const { archive, target } = req.body;
    if (isDangerDir(path.dirname(archive)) || isDangerDir(target)) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }
    await extract(archive, target);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

// 获取文件/文件夹大小和sha256
router.post('/get-size', async (req, res) => {
  try {
    const { path: p } = req.body;
    if (isDangerDir(p) || isDangerDir(path.dirname(p))) {
      return res.json({ success: false, danger: true, msg: '危险目录，禁止操作' });
    }

    let size = 0;
    const stats = await fs.stat(p);

    if (stats.isDirectory()) {
      // 计算目录大小
      const calculateSize = async (dir) => {
        let total = 0;
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          const fileStats = await fs.stat(fullPath);
          if (fileStats.isDirectory()) {
            total += await calculateSize(fullPath);
          } else {
            total += fileStats.size;
          }
        }
        return total;
      };
      size = await calculateSize(p);
    } else {
      size = stats.size;
    }

    res.json({ success: true, size });
  } catch (e) {
    res.json({ success: false, msg: e.message });
  }
});

module.exports = router;