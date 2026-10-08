/**
 * 极简 CDP 客户端（Node 内置 WebSocket），用来驱动 NarraLeaf Studio 的窗口做验收。
 *   node cdp.mjs list
 *   node cdp.mjs eval <窗口名关键字> "<js 表达式>"
 *   node cdp.mjs shot <窗口名关键字> <输出 png>
 */
const PORT = 9222;

export async function listTargets(port = PORT) {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    return res.json();
}

export class Session {
    constructor(ws) {
        this.ws = ws;
        this.id = 0;
        this.pending = new Map();
        ws.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.pending.has(msg.id)) {
                const { resolve, reject } = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
            }
        });
    }

    send(method, params = {}) {
        const id = ++this.id;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error(`CDP timeout: ${method}`));
                }
            }, 30000);
        });
    }

    async eval(expression) {
        const r = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
            userGesture: true,
        });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed');
        return r.result?.value;
    }

    async screenshot(file) {
        const r = await this.send('Page.captureScreenshot', { format: 'png' });
        const { writeFileSync } = await import('node:fs');
        writeFileSync(file, Buffer.from(r.data, 'base64'));
        return file;
    }

    close() { this.ws.close(); }
}

export async function open(titlePart, port = PORT) {
    const targets = (await listTargets(port)).filter((t) => t.type === 'page');
    const target = targets.find((t) => t.title.includes(titlePart)) ?? targets.find((t) => t.url.includes(titlePart));
    if (!target) throw new Error(`no window matching "${titlePart}" (have: ${targets.map((t) => t.title).join(', ')})`);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', reject, { once: true });
    });
    const session = new Session(ws);
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    return session;
}

if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] ?? '').href) {
    const [cmd, a, b] = process.argv.slice(2);
    if (cmd === 'list') {
        for (const t of await listTargets()) console.log(`${t.type}\t${t.title}\t${t.url}`);
    } else if (cmd === 'eval') {
        const s = await open(a);
        const value = await s.eval(b);
        console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
        s.close();
    } else if (cmd === 'shot') {
        const s = await open(a);
        await s.screenshot(b);
        console.log('saved ' + b);
        s.close();
    } else {
        console.log('usage: node cdp.mjs list | eval <window> <js> | shot <window> <png>');
    }
    process.exit(0);
}
