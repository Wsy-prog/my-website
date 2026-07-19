# 音乐播放器 LRC 歌词功能

## Context

音乐播放器现在只播放音频，没有歌词显示。用户希望能上传 `.lrc` 歌词文件，歌曲播放时同步滚动显示歌词。歌词文本作为 `Track` 的新字段存储在歌曲数据中，通过现有的 localStorage + API 同步机制保存到 Neon 数据库。

## 修改文件（1个）

只有 `src/components/music/MusicPlayer.tsx`，所有 UI 和数据逻辑都在这个文件里。

## 实现方案

### 1. 数据模型扩展

`Track` 接口新增 `lyrics?: string` 字段，存储原始 LRC 文本：

```ts
interface Track {
  title: string;
  artist: string;
  src: string;
  lyrics?: string;  // ← 新增
}
```

### 2. 管理界面：上传 LRC 按钮

在管理模式下，每首歌曲的右侧操作区域（`moveTrack`/`deleteTrack` 旁边）加一个"歌词"按钮：

- 有歌词时显示绿色小点表示已关联
- 点击弹出文件选择器，接受 `.lrc` 文件
- 用 `FileReader.readAsText()` 读取文件内容，存入 `track.lyrics`
- 提供"清除歌词"按钮移除已关联的歌词

### 3. LRC 解析函数

`src/components/music/MusicPlayer.tsx` 内部新增 `parseLRC()` 函数：

```ts
function parseLRC(lrc: string): { time: number; text: string }[] {
  const lines = lrc.split('\n');
  const result: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2})[\.:](\d{2,3})\](.*)/;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const m = parseInt(match[1]);
      const s = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = m * 60 + s + ms / (match[3].length === 3 ? 1000 : 100);
      const text = match[4].trim();
      if (text) result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}
```

### 4. 歌词同步显示

- 新增 `showLyrics` state（默认 false）
- 在当前曲目有歌词时，播放器底部显示一个"📃 歌词"切换按钮
- 歌词模式：用 `parsedLyrics`（`useMemo` 缓存解析结果）和 `progress`（来自 `timeupdate` 事件）找出当前行
- 当前行高亮（`text-primary font-medium`），其他行灰色（`text-muted-foreground`）
- 歌词区域可滚动，当前行自动保持在可视区域中间

### 5. 数据流

- `importFile()` 上传歌词：`FileReader.readAsText(file)` → `track.lyrics = text`
- 歌词文本通过 `saveTracks()` → `localStorage` + `syncToApi()` → Neon 数据库自动同步
- 无需修改 API 路由

## UI 布局

播放器面板底部两个模式：

**默认模式**（当前）：歌曲列表
**歌词模式**（新）：显示同步滚动的歌词

切换方式：有歌词时显示"📃"按钮，点击切换

## 验证方式

1. 启动 `npm run dev`
2. 点击音乐播放器 → ⚙️ 管理
3. 对任意歌曲点"歌词"按钮 → 选 `.lrc` 文件
4. 返回播放模式 → 看到"📃"按钮 → 点它切换到歌词视图
5. 播放歌曲 → 歌词随时间高亮滚动
6. 刷新页面 → 歌词仍在（localStorage 持久化）
7. 清除歌词 → 歌词消失