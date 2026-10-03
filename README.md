# 立体九宫格照片生成器

上传九张底图和一张人物照片，自动抠出人物并叠在可换位的九宫格上，最后导出 PNG 或 JPG。

## 本机运行

需要 Python 3 和现代浏览器。在本目录运行：

```powershell
python server.py
```

打开 <http://127.0.0.1:4173>。请使用上面的启动命令：它会正确设置 JavaScript 模块的响应类型，否则某些 Windows 环境会把 `.js` 当作纯文本，导致上传后页面没有反应。项目页面本身没有 npm 安装步骤。首次自动抠图会从 `esm.sh` 加载 `@imgly/background-removal` 及其模型资源，因此浏览器需要联网；加载后能否离线复用取决于浏览器缓存。

## 在线部署

将整个目录作为静态站点部署即可，入口为 `index.html`。无需应用后端，照片仅在用户浏览器内处理。

### 发布到 GitHub Pages

1. 在 GitHub 创建一个**公开**的空仓库，例如 `pictureGenerate`，不要勾选自动添加 README。
2. 在本项目目录初始化 Git，并只提交网页和发布配置。将下面命令中的 GitHub 用户名和仓库名换成自己的：

   ```powershell
   git init
   git branch -M main
   git add .gitignore .github/workflows/pages.yml index.html styles.css src README.md
   git commit -m "Publish photo collage website"
   git remote add origin https://github.com/你的用户名/pictureGenerate.git
   git push -u origin main
   ```

3. 打开仓库的 **Settings → Pages**，将 **Build and deployment → Source** 设为 **GitHub Actions**。到 **Actions** 查看 `Publish website to GitHub Pages` 的运行结果；如果首次推送时尚未启用 Pages，可在启用后手动运行该工作流。
4. 部署完成后，公开网址为 `https://你的用户名.github.io/pictureGenerate/`。以后向 `main` 推送网页改动，会自动重新发布。若使用其他仓库名，网址中的路径也相应变化。

发布流程只把 `index.html`、`styles.css` 和 `src/` 放进网站，不会发布测试照片、论文或 Python 服务文件。`.gitignore` 也排除了本机的 `testPic/` 和 `acpv-net-paper.pdf`，避免使用 `git add .` 时意外公开；首次推送前仍建议用 `git status` 检查提交清单。GitHub Pages 自动提供 HTTPS 和正确的 JavaScript 模块响应类型，不需要运行 `server.py`。

自动抠图仍需访问 `esm.sh` 下载模块和模型；若访问该服务不稳定，页面能打开但抠图可能失败。GitHub Pages 的可访问性也会因访问者所在网络而异。

若部署环境不允许访问 `esm.sh`，需将 `@imgly/background-removal` 的浏览器模块及其模型资源自行托管，再在 `index.html` 加载 `src/app.js` 前设置：

```html
<script>
  const vendor = new URL('./vendor/', document.baseURI);
  window.PORTRAIT_GRID_CONFIG = {
    moduleUrl: new URL('background-removal.js', vendor).href,
    assetPath: new URL('background-removal-assets/', vendor).href
  };
</script>
```

具体资源路径应与所使用的库版本一致；使用本项目的 Pages 工作流时，还需把 `vendor/` 加入发布文件清单。当前默认使用公开 ESM 分发地址，项目不附带该库或模型文件。该库开源版本采用 AGPL 许可证；再分发前请遵守其许可证要求。

## 使用

1. 一次选择最多九张底图。拖动缩略图，或依次点选两个格子来交换位置；每格右下角可单独更换。
2. 选择人物照片，等待自动抠图。失败时可点“重新尝试自动抠图”。
3. 用上、右、下、左四个滑杆分别调整九宫格外侧留白。九宫格本身尺寸不变，增加留白会向对应方向扩大成品画布。在预览中拖动人物，或聚焦画布后用方向键移动人物（按住 Shift 可加快）；其他滑杆可调整人物大小和阴影。
4. 九张底图和抠图都准备好后，选择九宫格尺寸并导出 PNG 或 JPG。界面会显示加入四边留白后的最终像素尺寸。例如九宫格为 2400 像素、四边各 5% 时，成品为 2640 × 2640 像素。

接受 JPG、PNG、WebP、AVIF、GIF 和 BMP，每张最多 30 MB。GIF 只使用浏览器解码的当前帧。刷新页面会清除本次编辑状态。

## 测试

```powershell
npm test
```

Node 测试覆盖顺序、画布几何、合成顺序、图片校验和抠图适配层。真实抠图需要加载外部模型，须在可联网浏览器中另行验证。
