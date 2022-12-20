import { dir2array } from 'https://js.sabae.cc/dir2array.js';

const input = 'dist/esm/';
const output = 'dist/esm-js/';

const tslib = 'https://code4fukui.github.io/tslib/tslib.es6.js';
//const tslib = "../../../../node_modules/tslib/tslib.es6.js";

export const convertToJS = (js) => {
  const ss = js.split('\n');
  const res = [];
  for (const s of ss) {
    if (s.startsWith('import ') && (s.endsWith('\'tslib\';') || s.endsWith('"tslib";'))) {
      const s2 = s.substring(0, s.length - '\'tslib\';'.length) + `'${tslib}';`;
      res.push(s2);
    } else if ((s.startsWith('import ') || s.startsWith('export ')) && s.endsWith('\';')) {
      const s2 = s.substring(0, s.length - 2) + '.js\';';
      res.push(s2);
    } else if ((s.startsWith('import ') || s.startsWith('export ')) && s.endsWith('";')) {
      const s2 = s.substring(0, s.length - 2) + '.js";';
      res.push(s2);
    } else {
      res.push(s);
    }
  }
  return res.join('\n');
};

export const makeFolder = async (fn) => {
  if (fn.startsWith('/')) {
    throw new Error('can\'t use root path');
  }
  const n = fn.lastIndexOf('/');
  const dir = fn.substring(0, n);
  await Deno.mkdir(dir, { recursive: true });
};

const fns = await dir2array(input);
for (const fn of fns) {
  if (!fn.endsWith('.js')) {
    continue;
  }
  const ifn = input + fn;
  const ofn = output + fn;
  console.log(ofn);
  await makeFolder(ofn);
  const s = await Deno.readTextFile(ifn);
  const s2 = convertToJS(s);
  await Deno.writeTextFile(ofn, s2);
}
