/**
 * 就地更新已存在项目的 `<Name>.nlproj`（msgpack）：重新生成插件依赖表与本地化声明。
 * 不会动项目里的任何内容文件。插件版本按本机已安装的写，避免 Studio 报「插件不可用」。
 *
 *   node patch-config.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { config as game, projectConfigFile, loadMsgpack } from './lib/config.mjs';
import { desiredDependencies } from './create-project.mjs';

const msgpack = await loadMsgpack();
const full = projectConfigFile();
const data = msgpack.decode(fs.readFileSync(full));

const dependencies = desiredDependencies();
if (dependencies) data.dependencies = dependencies;
else delete data.dependencies;

data.app = data.app ?? {};
data.app.localization = {
    sourceLocale: game.sourceLocale,
    locales: [{
        code: game.sourceLocale,
        displayName: String(game.sourceLocale).startsWith('zh') ? '中文（简体）' : game.sourceLocale,
    }],
};

fs.writeFileSync(full, msgpack.encode(data));

console.log('── 项目配置已更新 ──');
console.log('  name          :', data.name);
console.log('  identifier    :', data.identifier);
console.log('  locale        :', data.app.localization.sourceLocale);
console.log('  dependencies  :', dependencies ? dependencies.plugins.map((p) => `${p.id}@${p.authoredVersion}`).join(', ') : '(无)');
console.log('  写入          :', full, `(${fs.statSync(full).size} 字节)`);
