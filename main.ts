// Tiny Stack VM entry. Reads /input/<id>/program.bin + input.bin and writes
// /output/<id>/stdout.bin + exit.txt for every instance.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const LIMIT_OUT = 65536;
const LIMIT_STEPS = 1000000;

function run(prog: Buffer, input: Buffer): { out: Buffer; code: number } {
  const o: number[] = [];
  const st: number[] = [];
  const cs: number[] = [];
  const mem = new Int32Array(256);
  let pc = 0, ip = 0, steps = 0, code = 0, running = true;

  const trap = (c: number) => { code = c; running = false; };
  const pop = (): number => st.length ? st.pop()! : (trap(2), 0);
  const push = (v: number) => {
    if (st.length >= 256) { trap(3); return; }
    st.push(v | 0);
  };
  const imm = (n: number, signed = false): number => {
    if (pc + n > prog.length) { trap(9); return 0; }
    let v = 0;
    for (let i = 0; i < n; i++) v |= prog[pc + i] << (8 * i);
    pc += n;
    if (signed) return n === 1 ? (v << 24 >> 24) : n === 2 ? (v << 16 >> 16) : (v | 0);
    return v;
  };
  const need = (n: number): boolean => {
    if (st.length < n) { trap(2); return false; }
    return true;
  };
  const bin = (f: (a: number, b: number) => number) => {
    if (!need(2)) return;
    const b = st.pop()!, a = st.pop()!;
    push(f(a, b));
  };
  const write = (bytes: number[]) => {
    if (o.length + bytes.length > LIMIT_OUT) { trap(11); return; }
    for (const b of bytes) o.push(b);
  };

  while (running) {
    if (steps >= LIMIT_STEPS) { trap(10); break; }
    if (pc < 0 || pc >= prog.length) { trap(9); break; }
    const op = prog[pc++];
    steps++;
    switch (op) {
      case 0x00: running = false; break;
      case 0x01: push(imm(1, true)); break;
      case 0x02: push(imm(4, true)); break;
      case 0x03: pop(); break;
      case 0x04: { if (!need(1)) break; const a = st[st.length - 1]; push(a); break; }
      case 0x05: { if (!need(2)) break; const b = st.pop()!, a = st.pop()!; push(b); push(a); break; }
      case 0x06: { if (!need(2)) break; const a = st[st.length - 2]; push(a); break; }
      case 0x07: { if (!need(3)) break; const c = st.pop()!, b = st.pop()!, a = st.pop()!; push(b); push(c); push(a); break; }
      case 0x10: bin((a, b) => (a + b) | 0); break;
      case 0x11: bin((a, b) => (a - b) | 0); break;
      case 0x12: bin((a, b) => Math.imul(a, b)); break;
      case 0x13: bin((a, b) => {
        if (b === 0) { trap(4); return 0; }
        if (a === -2147483648 && b === -1) return -2147483648;
        return (a / b) | 0;
      }); break;
      case 0x14: bin((a, b) => {
        if (b === 0) { trap(4); return 0; }
        if (b === -1) return 0;
        return (a % b) | 0;
      }); break;
      case 0x15: bin((a, b) => {
        if (b === 0) { trap(4); return 0; }
        return ((a >>> 0) / (b >>> 0)) | 0;
      }); break;
      case 0x16: bin((a, b) => {
        if (b === 0) { trap(4); return 0; }
        return ((a >>> 0) % (b >>> 0)) | 0;
      }); break;
      case 0x17: { if (!need(1)) break; push(-st.pop()!); break; }
      case 0x18: bin((a, b) => a & b); break;
      case 0x19: bin((a, b) => a | b); break;
      case 0x1a: bin((a, b) => a ^ b); break;
      case 0x1b: { if (!need(1)) break; push(~st.pop()!); break; }
      case 0x1c: bin((a, b) => a << (b & 31)); break;
      case 0x1d: bin((a, b) => a >> (b & 31)); break;
      case 0x1e: bin((a, b) => a >>> (b & 31)); break;
      case 0x20: bin((a, b) => a === b ? 1 : 0); break;
      case 0x21: bin((a, b) => a < b ? 1 : 0); break;
      case 0x22: bin((a, b) => (a >>> 0) < (b >>> 0) ? 1 : 0); break;
      case 0x30: { const off = imm(2, true); if (running) pc += off; break; }
      case 0x31: { const off = imm(2, true); if (!running) break; if (!need(1)) break; if (st.pop() === 0) pc += off; break; }
      case 0x32: { const off = imm(2, true); if (!running) break; if (!need(1)) break; if (st.pop() !== 0) pc += off; break; }
      case 0x33: { const t = imm(2); if (!running) break; if (cs.length >= 64) { trap(7); break; } cs.push(pc); pc = t; break; }
      case 0x34: { if (!cs.length) { trap(8); break; } pc = cs.pop()!; break; }
      case 0x40: { if (!need(1)) break; const a = st.pop()!; if (a < 0 || a > 255) { trap(6); break; } push(mem[a]); break; }
      case 0x41: { if (!need(2)) break; const a = st.pop()!, v = st.pop()!; if (a < 0 || a > 255) { trap(6); break; } mem[a] = v; break; }
      case 0x50: { if (!need(1)) break; const v = st.pop()!; write(String(v).split('').map(c => c.charCodeAt(0))); break; }
      case 0x51: { if (!need(1)) break; write([st.pop()! & 255]); break; }
      case 0x52: push(ip < input.length ? input[ip++] : -1); break;
      case 0x53: { if (!need(1)) break; code = st.pop()! & 255; running = false; break; }
      default: trap(5); break;
    }
  }
  return { out: Buffer.from(o), code };
}

for (const id of readdirSync(I).sort()) {
  const dir = join(I, id);
  const prog = readFileSync(join(dir, 'program.bin'));
  const input = readFileSync(join(dir, 'input.bin'));
  const { out, code } = run(prog, input);
  const odir = join(O, id);
  mkdirSync(odir, { recursive: true });
  writeFileSync(join(odir, 'stdout.bin'), out);
  writeFileSync(join(odir, 'exit.txt'), `${code}\n`);
}
